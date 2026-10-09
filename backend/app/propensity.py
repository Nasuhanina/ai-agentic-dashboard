"""Likelihood-to-buy model and campaign builder on top of customer360.csv.

Reads the same CSV the dashboard already loads (see ``data.generator._CSV_PATH``)
and keeps the raw columns it needs, so the existing ``User`` model is untouched.

* 10 products, each scored with a small logistic scorecard over CSV columns,
  with plain-English reasons ("+ Policy ends within 60 days").
* Web visitors get an app-download likelihood.
* Campaign builder: audience above a likelihood threshold, with channel and offer
  effects measured from the campaign history in the CSV.

When no CSV is available (mock-data mode) ``available()`` is False and the
endpoints say so instead of failing.
"""
from __future__ import annotations

import csv
import math
import os
from datetime import datetime

try:
    from .data.generator import TODAY, _CSV_PATH
except ImportError:  # running main.py as a script
    from data.generator import TODAY, _CSV_PATH

PRODUCTS: dict[str, str] = {
    "insurance_switch": "Insurance renewal / switch",
    "phv_insurance": "Private-hire insurance",
    "new_driver_insurance": "New-driver insurance",
    "sell_car": "Sell car",
    "coe_renewal_loan": "COE renewal loan",
    "car_financing": "Next-car financing",
    "workshop_booking": "Workshop booking",
    "ev_charging": "EV charging plan",
    "roadside_assistance": "Roadside assistance",
    "extended_warranty": "Extended warranty",
}
APP_DOWNLOAD = "app_download"

# Value of one sale to the platform (SGD). Insurance products earn a commission on the premium.
INS_COMMISSION = 0.12
FLAT_VALUE = {
    "sell_car": 500, "coe_renewal_loan": 800, "car_financing": 1200, "workshop_booking": 60,
    "ev_charging": 60, "roadside_assistance": 35, "extended_warranty": 250, APP_DOWNLOAD: 30,
}
CHANNELS = ["Push", "WhatsApp", "Email", "SMS"]
CHANNEL_COST = {"Push": 0.0, "WhatsApp": 0.05, "Email": 0.0, "SMS": 0.03}
OFFERS = ["No offer", "10% discount", "500 bonus mPoints", "Free car wash"]

# Profile groups, first match wins: (key, label, rule)
GROUPS = [
    ("carless", "Recently car-less", lambda r: _n(r, "vehicle_count") == 0),
    ("phv", "Private-hire driver", lambda r: r.get("vehicle_use") == "Private-hire" or _y(r, "phv_licence")),
    ("newbie", "P-plate newbie", lambda r: r.get("driver_experience") == "New"),
    ("coe", "COE crossroads", lambda r: (_n(r, "months_to_coe_expiry") is not None and _n(r, "months_to_coe_expiry") <= 14)),
    ("dormant", "Dormant owner", lambda r: r.get("engagement_tier") == "Dormant"),
    ("ev", "EV adopter", lambda r: r.get("fuel_type") == "EV"),
    ("luxury", "Luxury owner", lambda r: r.get("vehicle_segment") == "Luxury"),
    ("family", "Young family", lambda r: r.get("life_stage") == "Young family"),
    ("continental", "Continental commuter", lambda r: r.get("vehicle_segment") == "Continental"),
    ("weekend", "Weekend driver", lambda r: (_n(r, "weekend_trip_pct") or 0) >= 55
     or (_n(r, "km_driven_90d") is not None and _n(r, "km_driven_90d") < 1500)),
    ("regular", "Mainstream regular", lambda r: True),
]
WEB_GROUPS = [
    ("w_high", "Web: high-intent owner", lambda r: _y(r, "entered_plate_in_valuation_tool") or _y(r, "quote_form_started")),
    ("w_shop", "Web: car shopper", lambda r: r.get("top_web_page") in ("New car prices", "Car loan calculator")),
    ("w_bounce", "Web: bounced", lambda r: (_n(r, "pages_per_session") or 9) < 1.4 and (_n(r, "web_sessions_90d") or 9) <= 2),
    ("w_browse", "Web: browser", lambda r: True),
]
GROUP_LABEL = {k: label for k, label, _ in GROUPS + WEB_GROUPS}


# ---------------------------------------------------------------- helpers

def _n(r: dict, k: str) -> float | None:
    v = (r.get(k) or "").strip()
    try:
        return float(v) if v else None
    except ValueError:
        return None


def _y(r: dict, k: str) -> bool:
    return (r.get(k) or "").strip().upper() == "Y"


def _days_to(iso: str) -> int | None:
    if not iso:
        return None
    try:
        return (datetime.strptime(iso, "%Y-%m-%d").date() - TODAY).days
    except ValueError:
        return None


def _sig(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def _card(base: float, terms: list[tuple[float, object, str]]) -> dict:
    """Logistic scorecard. Each term: (weight, bool-or-number, reason)."""
    x, why = base, []
    for w, v, reason in terms:
        val = (1.0 if v else 0.0) if isinstance(v, bool) else float(v or 0)
        if not val:
            continue
        x += w * val
        if abs(w * val) >= 0.45:
            why.append((w * val, ("+ " if w * val > 0 else "− ") + reason))
    why.sort(key=lambda t: -t[0])
    return {"p": _sig(x), "why": [t[1] for t in why]}


_OFF = {"p": 0.005, "why": ["Not applicable"]}


def value_of(r: dict, product: str) -> float:
    prem = _n(r, "annual_premium_sgd") or 1200
    if product == "insurance_switch":
        return prem * INS_COMMISSION
    if product == "phv_insurance":
        return max(prem, 3500) * INS_COMMISSION
    if product == "new_driver_insurance":
        return max(prem, 2800) * INS_COMMISSION
    return float(FLAT_VALUE[product])


# ---------------------------------------------------------------- scorecards

def score_app(r: dict) -> dict[str, dict]:
    S: dict[str, dict] = {}
    active = (_n(r, "vehicle_count") or 0) > 0
    d = _n(r, "days_to_insurance_expiry")
    m = _n(r, "months_to_coe_expiry")
    vchk = _n(r, "valuation_checks_90d") or 0
    ncv = _n(r, "new_car_page_views_30d") or 0
    dormant = r.get("engagement_tier") == "Dormant"
    hdb = (r.get("housing_type") or "").startswith("HDB")
    seg = r.get("vehicle_segment")
    lux, contlux = seg == "Luxury", seg in ("Continental", "Luxury")
    phv = r.get("vehicle_use") == "Private-hire"
    lic = _n(r, "licence_years")
    new_drv = lic is not None and lic < 2
    vis_ins = _y(r, "visited_insurance_page")
    prem = _n(r, "annual_premium_sgd") or 0
    age_yrs = _n(r, "vehicle_age_years") or 0

    if not active:
        for p in PRODUCTS:
            S[p] = _OFF
        sold = _days_to(r.get("sale_date", ""))
        months_since = (-sold / 30) if sold is not None else 6
        S["car_financing"] = _card(-0.5, [(0.07, min(ncv, 30), "Viewing new-car pages"),
                                          (-0.25, months_since, "Months since sale"),
                                          (1.5, True, "No car right now")])
        return S

    fleet = r.get("insurance_type") in ("Fleet (rental company)", "Company fleet")
    S["insurance_switch"] = _card(-2.6, [
        (1.8, d is not None and d <= 60, "Policy ends within 60 days"),
        (0.9, d is not None and 60 < d <= 90, "Policy ends within 90 days"),
        (0.7, vis_ins, "Browsed insurance pages"),
        (0.9, _y(r, "renewal_quote_requested"), "Asked for a renewal quote"),
        (0.4, _y(r, "insured_via_platform"), "Bought via app before"),
        (-1.2, dormant, "Dormant in app"),
        (-0.5, lux, "Luxury owners rarely switch"),
        (-3.0, fleet, "Insured by fleet/company"),
    ])
    S["phv_insurance"] = _card(-1.8, [
        (2.4, r.get("insurance_type") == "Private", "Private policy may not cover private-hire trips"),
        (1.0, d is not None and d <= 90, "Renewal within 90 days"),
        (0.4, vis_ins, "Browsed insurance pages"),
    ]) if phv and r.get("insurance_type") != "Fleet (rental company)" else _OFF
    S["new_driver_insurance"] = _card(-1.2, [
        (1.2, d is not None and d <= 90, "Renewal within 90 days"),
        (0.6, prem > 2500, "Paying over $2,500 premium"),
        (0.5, vis_ins, "Browsed insurance pages"),
        (0.3, (_n(r, "age") or 99) < 25, "Under 25"),
    ]) if new_drv else _OFF
    S["sell_car"] = _card(-4.0, [
        (2.4, m is not None and m <= 6, "COE ends within 6 months"),
        (1.2, m is not None and 6 < m <= 14, "COE ends within 14 months"),
        (0.08, min(vchk, 30), "Checks car value often"),
        (1.0, _y(r, "visited_sell_car_page"), "Browsed sell-car pages"),
        (0.5, ncv >= 2, "Looking at new cars"),
        (0.4, age_yrs > 8, "Car over 8 years old"),
    ])
    S["coe_renewal_loan"] = _card(-2.0, [
        (0.9, _y(r, "visited_coe_page"), "Browsed COE renewal pages"),
        (0.5, hdb, "HDB household"),
        (-0.08, min(vchk, 30), "Checking value often (likely selling)"),
        (-0.8, lux, "Luxury owner"),
        (-0.6, _y(r, "visited_sell_car_page"), "Browsed sell-car pages"),
    ]) if m is not None and m <= 14 else {"p": 0.01, "why": ["COE not ending soon"]}
    S["car_financing"] = _card(-4.2, [
        (0.06, min(ncv, 30), "Viewing new-car pages"),
        (1.0, m is not None and m <= 14 and vchk >= 8, "Likely replacing car soon"),
        (0.4, r.get("life_stage") == "Young family", "Young family"),
    ])
    w_end = _days_to(r.get("warranty_end_date", ""))
    S["workshop_booking"] = _card(-2.6, [
        (1.5, phv, "Private-hire: very high mileage"),
        (0.6, _n(r, "services_last_12m") == 0, "No service in 12 months"),
        (0.5, (_n(r, "mileage_km") or 0) > 100000, "Over 100,000 km"),
        (0.6, contlux and w_end is not None and w_end <= 0, "Out of manufacturer warranty"),
        (0.3, age_yrs > 6, "Car over 6 years old"),
        (-1.0, dormant, "Dormant in app"),
    ])
    S["ev_charging"] = _card(-0.9, [
        (1.0, phv, "Private-hire EV: charges daily"),
        (0.5, hdb, "HDB: no home charger"),
        (-0.8, dormant, "Dormant in app"),
    ]) if r.get("fuel_type") == "EV" and not _y(r, "ev_charging_subscriber") else _OFF
    S["roadside_assistance"] = _card(-3.0, [
        (1.3, r.get("life_stage") == "Young family", "Young family"),
        (0.1, min(age_yrs, 12), "Older car"),
        (0.7, new_drv, "New driver"),
        (0.02, _n(r, "night_driving_pct") or 0, "Drives at night"),
        (-0.8, dormant, "Dormant in app"),
    ]) if not _y(r, "roadside_assistance_member") else _OFF
    S["extended_warranty"] = _card(-0.6, [
        (0.6, seg == "Continental", "Continental car"),
        (0.4, True, f"Warranty ends in {w_end} days" if w_end and w_end > 0 else "Warranty just ended"),
        (-0.8, dormant, "Dormant in app"),
    ]) if contlux and not _y(r, "has_extended_warranty") and w_end is not None and -180 <= w_end <= 270 \
        else {"p": 0.008, "why": ["Warranty not ending soon"]}
    return S


def score_web(r: dict) -> dict:
    s = max(1.0, _n(r, "web_sessions_90d") or 1)
    return _card(-3.6, [
        (1.2, _y(r, "entered_plate_in_valuation_tool"), "Entered a plate (owns a car)"),
        (0.8, _y(r, "quote_form_started"), "Started a quote"),
        (0.4, _y(r, "quote_form_completed"), "Submitted a quote"),
        (0.5, _y(r, "email_captured"), "Email known"),
        (0.7, math.log(s), "Returns often"),
        (0.5, r.get("device_type") == "Mobile", "On mobile"),
        (0.25, min(_n(r, "app_banner_clicks") or 0, 3), "Clicked app banner"),
        (-1.5, (_n(r, "pages_per_session") or 9) < 1.4 and s <= 2, "Bounced"),
    ])


# ---------------------------------------------------------------- load once

class Customer:
    __slots__ = ("id", "name", "row", "is_web", "group", "scores", "web", "best", "reachable", "dup_of", "campaigns")


def _load() -> list[Customer]:
    if not _CSV_PATH or not os.path.isfile(_CSV_PATH):
        return []
    with open(_CSV_PATH, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    if not rows or "campaign1_product" not in rows[0]:
        return []
    out: list[Customer] = []
    seen: dict[str, str] = {}
    # duplicate sign-ups: same name (any case) + same plate; earliest signup is the original
    for r in sorted(rows, key=lambda r: r.get("signup_date") or "9999"):
        c = Customer()
        c.id = r.get("customer_id", "")
        c.name = r.get("full_name") or c.id
        c.row = r
        c.is_web = "web" in (r.get("user_type") or "").lower()
        c.dup_of = None
        if not c.is_web and r.get("full_name"):
            key = r["full_name"].lower() + "|" + (r.get("plate_number") or "")
            if key in seen:
                c.dup_of = seen[key]
            else:
                seen[key] = c.id
        c.group = next(k for k, _, rule in (WEB_GROUPS if c.is_web else GROUPS) if rule(r))
        c.campaigns = [
            {"date": r.get(f"campaign{i}_date"), "product": r.get(f"campaign{i}_product"),
             "channel": r.get(f"campaign{i}_channel"), "offer": r.get(f"campaign{i}_offer"),
             "converted": _y(r, f"campaign{i}_converted")}
            for i in (1, 2, 3) if r.get(f"campaign{i}_product")
        ]
        c.reachable = (not c.is_web) and _y(r, "marketing_consent") and c.dup_of is None
        if c.is_web:
            c.scores, c.web, c.best = {}, score_web(r), None
        else:
            c.scores, c.web = score_app(r), None
            c.best = max(PRODUCTS, key=lambda p: c.scores[p]["p"] * value_of(r, p))
        out.append(c)
    return out


CUSTOMERS: list[Customer] = _load()
BY_ID = {c.id: c for c in CUSTOMERS}


def available() -> bool:
    return bool(CUSTOMERS)


def likelihood(c: Customer, product: str) -> float | None:
    """'' = best offer for app users / download for web visitors."""
    if not product:
        return c.web["p"] if c.is_web else c.scores[c.best]["p"]
    if product == APP_DOWNLOAD:
        return c.web["p"] if c.is_web else None
    return None if c.is_web else c.scores[product]["p"]


def expected_value(c: Customer, product: str) -> float:
    if c.is_web:
        return c.web["p"] * FLAT_VALUE[APP_DOWNLOAD]
    p = product or c.best
    return c.scores[p]["p"] * value_of(c.row, p)


# ---------------------------------------------------------------- campaign history effects

def _rate_by(field: str) -> dict[str, tuple[int, int]]:
    t: dict[str, list[int]] = {}
    for c in CUSTOMERS:
        for k in c.campaigns:
            cell = t.setdefault(k[field], [0, 0])
            cell[0] += 1
            cell[1] += int(k["converted"])
    return {k: (v[0], v[1]) for k, v in t.items()}


def channel_factor(channel: str) -> float:
    t = _rate_by("channel")
    sent, bought = sum(v[0] for v in t.values()), sum(v[1] for v in t.values())
    if channel not in t or not sent or not bought:
        return 1.0
    return (t[channel][1] / t[channel][0]) / (bought / sent)


def offer_factor(offer: str) -> float:
    t = _rate_by("offer")
    base = t.get("No offer")
    if offer not in t or not base or not base[1]:
        return 1.0
    return (t[offer][1] / t[offer][0]) / (base[1] / base[0])


def history() -> dict:
    def rows(field):
        return sorted(({"key": k, "sent": s, "bought": b, "rate": round(b / s, 4) if s else 0} for k, (s, b) in _rate_by(field).items()),
                      key=lambda x: -x["rate"])
    return {"by_channel": rows("channel"), "by_offer": rows("offer"), "by_product": rows("product")}


# ---------------------------------------------------------------- public API

def meta() -> dict:
    return {
        "available": available(),
        "products": [{"key": k, "label": v} for k, v in PRODUCTS.items()],
        "app_download": {"key": APP_DOWNLOAD, "label": "App download (web visitors)"},
        "groups": [{"key": k, "label": label} for k, label, _ in GROUPS],
        "web_groups": [{"key": k, "label": label} for k, label, _ in WEB_GROUPS],
        "channels": CHANNELS, "offers": OFFERS, "channel_cost": CHANNEL_COST,
        "value_per_sale": {**{k: v for k, v in FLAT_VALUE.items()}, "insurance_commission_pct": INS_COMMISSION * 100},
        "as_of": TODAY.isoformat(),
    }


def _row(c: Customer, product: str) -> dict:
    p = likelihood(c, product)
    prod = product or (APP_DOWNLOAD if c.is_web else c.best)
    why = c.web["why"] if c.is_web else c.scores[prod]["why"]
    return {
        "id": c.id, "name": c.name, "user_type": c.row.get("user_type"), "group": c.group, "group_label": GROUP_LABEL[c.group],
        "product": prod, "product_label": PRODUCTS.get(prod, "App download"),
        "likelihood": round(p or 0, 4), "value_sgd": round(FLAT_VALUE[APP_DOWNLOAD] if c.is_web else value_of(c.row, prod), 2),
        "expected_sgd": round(expected_value(c, product), 2), "reachable": c.reachable,
        "reason": why[0] if why else "", "duplicate_of": c.dup_of,
    }


def users(allowed_ids: set[str] | None, product: str, min_pct: float, group: str,
          page: int, page_size: int, sort: str) -> dict:
    L = [c for c in CUSTOMERS if (allowed_ids is None or c.id in allowed_ids) and (not group or c.group == group)]
    L = [c for c in L if (p := likelihood(c, product)) is not None and p * 100 >= min_pct]
    if sort == "id":
        L.sort(key=lambda c: c.id)
    elif sort == "value":
        L.sort(key=lambda c: -expected_value(c, product))
    else:
        L.sort(key=lambda c: -(likelihood(c, product) or 0))
    reach = [c for c in L if c.reachable]
    total = len(L)
    start = (page - 1) * page_size
    return {
        "total": total, "page": page, "pages": max(1, math.ceil(total / page_size)),
        "reachable": len(reach),
        "expected_sgd": round(sum(expected_value(c, product) for c in (L if product == APP_DOWNLOAD else reach)), 2),
        "items": [_row(c, product) for c in L[start:start + page_size]],
    }


def user(cid: str) -> dict | None:
    c = BY_ID.get(cid)
    if not c:
        return None
    base = {"id": c.id, "name": c.name, "group": c.group, "group_label": GROUP_LABEL[c.group],
            "reachable": c.reachable, "duplicate_of": c.dup_of, "is_web": c.is_web,
            "marketing_consent": _y(c.row, "marketing_consent"), "push_enabled": _y(c.row, "push_enabled"),
            "campaigns": c.campaigns}
    if c.is_web:
        base["products"] = [{"key": APP_DOWNLOAD, "label": "App download", "likelihood": round(c.web["p"], 4),
                             "value_sgd": FLAT_VALUE[APP_DOWNLOAD], "expected_sgd": round(c.web["p"] * FLAT_VALUE[APP_DOWNLOAD], 2),
                             "why": c.web["why"]}]
    else:
        base["products"] = sorted(({"key": p, "label": PRODUCTS[p], "likelihood": round(c.scores[p]["p"], 4),
                                    "value_sgd": round(value_of(c.row, p), 2),
                                    "expected_sgd": round(c.scores[p]["p"] * value_of(c.row, p), 2), "why": c.scores[p]["why"]}
                                   for p in PRODUCTS), key=lambda x: -x["expected_sgd"])
    return base


def campaign(allowed_ids: set[str] | None, product: str, group: str, channel: str, offer: str,
             min_pct: float, limit: int = 50) -> dict:
    cf, of = channel_factor(channel), offer_factor(offer)
    L = [c for c in CUSTOMERS if c.reachable and (allowed_ids is None or c.id in allowed_ids)
         and (not group or c.group == group) and c.scores[product]["p"] * 100 >= min_pct]
    if channel == "Push":
        L = [c for c in L if _y(c.row, "push_enabled")]
    L.sort(key=lambda c: -c.scores[product]["p"] * value_of(c.row, product))
    conv = rev = 0.0
    for c in L:
        q = min(0.98, c.scores[product]["p"] * cf * of)
        conv += q
        rev += q * value_of(c.row, product)
    msg_cost = len(L) * CHANNEL_COST.get(channel, 0)
    offer_cost = rev * 0.10 if offer == "10% discount" else conv * 5 if offer == "500 bonus mPoints" else conv * 15 if offer == "Free car wash" else 0
    return {
        "product": product, "product_label": PRODUCTS[product], "group": group, "channel": channel, "offer": offer, "min_pct": min_pct,
        "audience": len(L), "expected_sales": round(conv, 1), "revenue_sgd": round(rev, 2),
        "cost_sgd": round(msg_cost + offer_cost, 2), "net_sgd": round(rev - msg_cost - offer_cost, 2),
        "channel_factor": round(cf, 2), "offer_factor": round(of, 2),
        "items": [_row(c, product) for c in L[:limit]],
    }


def audience_csv(allowed_ids, product, group, channel, offer, min_pct) -> str:
    res = campaign(allowed_ids, product, group, channel, offer, min_pct, limit=10_000)
    lines = ["customer_id,name,group,product,likelihood,value_sgd,expected_sgd,channel,offer"]
    for x in res["items"]:
        name = (x["name"] or "").replace('"', '""')
        lines.append(f'{x["id"]},"{name}",{x["group_label"]},{product},{x["likelihood"]},{x["value_sgd"]},{x["expected_sgd"]},{channel},{offer}')
    return "\n".join(lines)
