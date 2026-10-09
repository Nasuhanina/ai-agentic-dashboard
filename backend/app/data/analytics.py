"""Aggregation helpers that turn the raw user records into dashboard-ready
shapes (distributions, KPIs, time series)."""
from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date
from typing import Any, Callable

try:
    from .generator import USERS, User, user_to_dict
except ImportError:
    from generator import USERS, User, user_to_dict

TODAY = date(2026, 10, 9)
AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
TIER_ORDER = ["Bronze", "Silver", "Gold", "Platinum"]
SENTIMENT_ORDER = ["Positive", "Neutral", "Negative"]
ACTIVITY_ORDER = ["Active", "Occasional", "Dormant", "At Risk"]
SEGMENT_ORDER = ["Mainstream", "Continental", "EV", "Luxury", "Unknown"]


def _login_bucket(u: User) -> str:
    d = u.days_since_last_login
    if d == 0: return "Today"
    if d <= 3: return "1-3d"
    if d <= 7: return "4-7d"
    if d <= 14: return "8-14d"
    if d <= 30: return "15-30d"
    return ">30d"


def _tenure_bucket(u: User) -> str:
    t = u.tenure_days
    if t < 180: return "<6m"
    if t < 365: return "6-12m"
    if t < 730: return "1-2y"
    if t < 1460: return "2-4y"
    return "4y+"


def _followup_bucket(u: User) -> str:
    d = u.days_since_follow_up
    if d <= 7: return "0-7d"
    if d <= 30: return "8-30d"
    if d <= 60: return "31-60d"
    return ">60d"


def _driving_band(score: int) -> str:
    if score < 50: return "Poor (<50)"
    if score < 70: return "Fair (50-69)"
    if score < 85: return "Good (70-84)"
    return "Excellent (85+)"


def _premium_band(value: float) -> str:
    if value < 1000: return "<1k"
    if value < 1500: return "1k-1.5k"
    if value < 2500: return "1.5k-2.5k"
    if value < 4000: return "2.5k-4k"
    return "4k+"


def _renewal_bucket(days: int) -> str:
    if days < 0: return "Expired"
    if days <= 30: return "0-30d"
    if days <= 60: return "31-60d"
    if days <= 90: return "61-90d"
    if days <= 180: return "91-180d"
    if days <= 365: return "181-365d"
    return ">365d"


def filter_users(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    user_type: str | None = None,
    age_band: str | None = None,
    housing_type: str | None = None,
    life_stage: str | None = None,
    platform: str | None = None,
    segment: str | None = None,
    channel: str | None = None,
    interaction_type: str | None = None,
    login_recency: str | None = None,
    tenure: str | None = None,
    follow_up_recency: str | None = None,
    driving_band: str | None = None,
    insurer: str | None = None,
    renewal: str | None = None,
    premium_band: str | None = None,
    ncd: str | None = None,
    claims: str | None = None,
    search: str | None = None,
) -> list[User]:
    result = USERS
    if city:
        result = [u for u in result if u.city.lower() == city.lower()]
    if sentiment:
        result = [u for u in result if u.sentiment.lower() == sentiment.lower()]
    if tier:
        result = [u for u in result if u.loyalty_tier.lower() == tier.lower()]
    if activity_status:
        result = [u for u in result if u.activity_status.lower() == activity_status.lower()]
    if gender:
        result = [u for u in result if u.gender.lower() == gender.lower()]
    if user_type:
        result = [u for u in result if u.user_type.lower() == user_type.lower()]
    if age_band:
        result = [u for u in result if u.age_band.lower() == age_band.lower()]
    if housing_type:
        result = [u for u in result if u.income_band.lower() == housing_type.lower()]
    if life_stage:
        result = [u for u in result if u.occupation.lower() == life_stage.lower()]
    if platform:
        result = [u for u in result if u.platform.lower() == platform.lower()]
    if segment:
        result = [u for u in result if u.primary_transport_mode.lower() == segment.lower()]
    if channel:
        result = [u for u in result if u.last_interaction_channel.lower() == channel.lower()]
    if interaction_type:
        result = [u for u in result if u.last_interaction_type.lower() == interaction_type.lower()]
    if login_recency:
        result = [u for u in result if _login_bucket(u) == login_recency]
    if tenure:
        result = [u for u in result if _tenure_bucket(u) == tenure]
    if follow_up_recency:
        result = [u for u in result if _followup_bucket(u) == follow_up_recency]
    if driving_band:
        result = [u for u in result if _driving_band(u.driving_score) == driving_band]
    if insurer:
        result = [u for u in result if u.insurer.lower() == insurer.lower()]
    if renewal:
        result = [u for u in result if u.days_to_insurance_expiry != -1 and _renewal_bucket(u.days_to_insurance_expiry) == renewal]
    if premium_band:
        result = [u for u in result if u.annual_premium_sgd > 0 and _premium_band(u.annual_premium_sgd) == premium_band]
    if ncd:
        result = [u for u in result if u.days_to_insurance_expiry != -1 and str(u.ncd_pct) == ncd]
    if claims:
        result = [u for u in result if u.days_to_insurance_expiry != -1 and str(u.claims_3y) == claims]
    if search:
        s = search.lower()
        result = [
            u for u in result
            if s in u.name.lower() or s in u.id.lower() or s in u.email.lower()
        ]
    return result


def _avg(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


def _avg_pos(values: list[float]) -> float:
    vals = [v for v in values if v]
    return round(sum(vals) / len(vals), 2) if vals else 0.0


def _distribution(users: list[User], key: Callable[[User], Any], order: list[str] | None = None) -> list[dict]:
    counts = Counter(key(u) for u in users)
    items = counts.items()
    if order:
        items = sorted(items, key=lambda kv: order.index(kv[0]) if kv[0] in order else 999)
    else:
        items = sorted(items, key=lambda kv: kv[1], reverse=True)
    total = len(users) or 1
    return [
        {"label": label, "value": value, "pct": round(value / total * 100, 1)}
        for label, value in items
    ]


def summary(users: list[User]) -> dict[str, Any]:
    n = len(users) or 1
    active = [u for u in users if u.days_since_last_login <= 14]
    follow_up_due = [u for u in users if u.follow_up_needed]
    avg_tenure = _avg([u.tenure_days for u in users])
    avg_login_gap = _avg([u.days_since_last_login for u in users])
    avg_csat = _avg_pos([u.satisfaction_csat for u in users])
    avg_driving = _avg_pos([u.driving_score for u in users])
    pos = sum(1 for u in users if u.sentiment == "Positive")
    neg = sum(1 for u in users if u.sentiment == "Negative")
    avg_points = _avg([u.loyalty_points for u in users])
    return {
        "total_users": len(users),
        "active_users": len(active),
        "active_pct": round(len(active) / n * 100, 1),
        "follow_up_due": len(follow_up_due),
        "follow_up_due_pct": round(len(follow_up_due) / n * 100, 1),
        "avg_tenure_days": avg_tenure,
        "avg_tenure_years": round(avg_tenure / 365, 1),
        "avg_days_since_login": avg_login_gap,
        "avg_csat": avg_csat,
        "avg_driving_score": avg_driving,
        "avg_loyalty_points": avg_points,
        "positive_pct": round(pos / n * 100, 1),
        "negative_pct": round(neg / n * 100, 1),
        "net_sentiment": round((pos - neg) / n * 100, 1),
    }


def demographics(users: list[User]) -> dict[str, Any]:
    return {
        "total": len(users),
        "age_bands": _distribution(users, lambda u: u.age_band, AGE_BANDS),
        "gender": _distribution(users, lambda u: u.gender, ["Male", "Female", "Other"]),
        "income": _distribution(users, lambda u: u.income_band, ["HDB 3-room", "HDB 4-room", "HDB 5-room / Executive", "Condo", "Landed", "Unknown"]),
        "regions": _distribution(users, lambda u: u.city),
        "occupation": _distribution(users, lambda u: u.occupation, ["Young single", "Single / couple", "Young family", "Established family", "Empty nester", "Senior", "Unknown"]),
        "avg_age": _avg([u.age for u in users]),
        "avg_household_size": _avg([u.household_size for u in users]),
    }


def activity(users: list[User]) -> dict[str, Any]:
    return {
        "status": _distribution(users, lambda u: u.activity_status, ACTIVITY_ORDER),
        "platform": _distribution(users, lambda u: u.platform, ["iOS", "Android"]),
        "avg_session_minutes": _avg([u.avg_session_minutes for u in users]),
        "avg_sessions_per_week": _avg([u.sessions_per_week for u in users]),
        "avg_logins_30d": _avg([u.logins_30d for u in users]),
        "avg_days_since_login": _avg([u.days_since_last_login for u in users]),
        "tenure_buckets": _distribution(users, _tenure_bucket, ["<6m", "6-12m", "1-2y", "2-4y", "4y+"]),
        "login_recency": _distribution(users, _login_bucket, ["Today", "1-3d", "4-7d", "8-14d", "15-30d", ">30d"]),
    }


def interactions(users: list[User]) -> dict[str, Any]:
    return {
        "channel": _distribution(users, lambda u: u.last_interaction_channel),
        "type": _distribution(users, lambda u: u.last_interaction_type),
        "total_interactions": sum(u.total_interactions for u in users),
        "avg_interactions": _avg([u.total_interactions for u in users]),
        "open_tickets_total": sum(u.open_tickets for u in users),
        "avg_csat": _avg_pos([u.satisfaction_csat for u in users]),
        "follow_up_due": sum(1 for u in users if u.follow_up_needed),
        "avg_days_since_follow_up": _avg([u.days_since_follow_up for u in users]),
        "follow_up_recency": _distribution(users, _followup_bucket, ["0-7d", "8-30d", "31-60d", ">60d"]),
    }


def driving_insights(users: list[User]) -> dict[str, Any]:
    scored = [u for u in users if u.driving_score > 0]
    return {
        "avg_driving_score": _avg_pos([u.driving_score for u in scored]),
        "avg_trips_30d": _avg_pos([u.trips_30d for u in scored]),
        "avg_total_km_30d": _avg_pos([u.total_km_30d for u in scored]),
        "avg_trip_distance_km": _avg_pos([u.avg_trip_distance_km for u in scored]),
        "avg_trip_duration_min": _avg_pos([u.avg_trip_duration_min for u in scored]),
        "avg_night_driving_pct": _avg([u.night_driving_pct for u in scored]),
        "total_km_30d": round(sum(u.total_km_30d for u in scored), 1),
        "harsh_braking_total": sum(u.harsh_braking_30d for u in users),
        "harsh_acceleration_total": sum(u.harsh_acceleration_30d for u in users),
        "speeding_total": sum(u.speeding_30d for u in users),
        "phone_usage_total": sum(u.phone_usage_events_30d for u in users),
        "transport_modes": _distribution(users, lambda u: u.primary_transport_mode, SEGMENT_ORDER),
        "driving_score_bands": _distribution(
            scored,
            lambda u: _driving_band(u.driving_score),
            ["Poor (<50)", "Fair (50-69)", "Good (70-84)", "Excellent (85+)"],
        ),
    }


def sentiment(users: list[User]) -> dict[str, Any]:
    # average sentiment trend across the population (8 buckets)
    buckets = [0.0] * 8
    counts = [0] * 8
    for u in users:
        for i, v in enumerate(u.sentiment_trend):
            buckets[i] += v
            counts[i] += 1
    trend = [
        {"index": i, "score": round(buckets[i] / counts[i], 3) if counts[i] else 0.0}
        for i in range(8)
    ]

    # top drivers split by polarity
    driver_counts: dict[str, Counter] = defaultdict(Counter)
    for u in users:
        for d in u.sentiment_drivers:
            driver_counts[u.sentiment][d] += 1

    top_negative = [{"label": k, "value": v} for k, v in driver_counts["Negative"].most_common(6)]
    top_positive = [{"label": k, "value": v} for k, v in driver_counts["Positive"].most_common(6)]

    return {
        "distribution": _distribution(users, lambda u: u.sentiment, SENTIMENT_ORDER),
        "avg_score": _avg([u.sentiment_score for u in users]),
        "trend": trend,
        "top_positive_drivers": top_positive,
        "top_negative_drivers": top_negative,
    }


def loyalty(users: list[User]) -> dict[str, Any]:
    # aggregate monthly points trend
    months: dict[str, list[int]] = defaultdict(list)
    for u in users:
        for pt in u.points_trend:
            months[pt["month"]].append(pt["points"])
    trend = [
        {"month": m, "points": int(sum(v) / len(v))}
        for m, v in sorted(months.items())
    ]

    earned = sum(u.points_earned_30d for u in users)
    redeemed = sum(u.points_redeemed_30d for u in users)

    return {
        "tier_distribution": _distribution(users, lambda u: u.loyalty_tier, TIER_ORDER),
        "total_points": sum(u.loyalty_points for u in users),
        "avg_points": _avg([u.loyalty_points for u in users]),
        "points_earned_30d": earned,
        "points_redeemed_30d": redeemed,
        "net_points_30d": earned - redeemed,
        "trend": trend,
        "tier_by_sentiment": _cross_tab(users, lambda u: u.loyalty_tier, lambda u: u.sentiment, TIER_ORDER, SENTIMENT_ORDER),
    }


SEGMENT_DEFS = [
    ("high_spenders", "High spenders", "Top 10% of monthly spend",
     "Reward top spenders with tiered cashback on renewals and bundle upsells (extended warranty, roadside) at their next renewal."),
    ("occasional", "Occasional visitors", "Fewer than 3 sessions per month",
     "Re-engage with weekly personalised reminders and an mPoints streak bonus after 2 sessions to build habit."),
    ("at_risk", "At risk of churn", "Active before, no login for 30+ days",
     "Trigger a win-back promo (service voucher or bonus mPoints) at day 30-45 with a 'what's new' nudge."),
    ("new_users", "New users", "Joined under 30 days ago",
     "Onboard to the top new-user services - insurance quote, valuation check, servicing reminder - with a first-purchase discount."),
    ("phv_drivers", "Private-hire drivers", "PHV licence holders",
     "Offer PHV perks: rest-stop and coffee vouchers, fuel/EV charging discounts and priority servicing."),
    ("multi_vehicle", "Multi-vehicle owners", "More than 1 registered vehicle",
     "Bundle a multi-vehicle discount across policies plus fleet-style servicing and roadside cover."),
    ("web_unregistered", "Unregistered web users", "Active on web but not the app",
     "Gamify app adoption: app-only rewards, mPoints bonus for first app login, and personalised push alerts."),
    ("insurance_renewal_due", "Insurance renewal due", "Policy expires within 90 days",
     "Send a renewal or switch quote via app push and email at 60 and 30 days before expiry."),
    ("ev_owners", "EV owners", "Electric vehicles",
     "Bundle EV insurance with charging credits and priority EV servicing."),
    ("high_mileage_drivers", "High-mileage drivers", "Mileage 100,000 km or more",
     "Offer maintenance and servicing plans plus inspection reminders."),
]


def _unique_member_names(members: list[User]) -> list[dict[str, str]]:
    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for u in sorted(members, key=lambda u: u.name):
        if u.name in seen:
            continue
        seen.add(u.name)
        unique.append({"id": u.id, "name": u.name})
    return unique


def segments(users: list[User]) -> dict[str, Any]:
    n = len(users) or 1
    spends = sorted(u.points_earned_30d for u in users if u.points_earned_30d > 0)
    cutoff = spends[int(round(0.9 * (len(spends) - 1)))] if spends else None

    predicates = {
        "high_spenders": lambda u: cutoff is not None and u.points_earned_30d >= cutoff,
        "occasional": lambda u: u.sessions_per_week * 4.3 < 3,
        "at_risk": lambda u: u.days_since_last_login > 30 and u.tenure_days >= 30,
        "new_users": lambda u: u.tenure_days < 30,
        "phv_drivers": lambda u: u.phv_licence,
        "multi_vehicle": lambda u: u.vehicle_count > 1,
        "web_unregistered": lambda u: u.user_type != "App user",
        "insurance_renewal_due": lambda u: 0 <= u.days_to_insurance_expiry <= 90,
        "ev_owners": lambda u: u.fuel_type.upper() == "EV",
        "high_mileage_drivers": lambda u: u.mileage_km >= 100000,
    }

    detail_fns = {
        "high_spenders": lambda m: f"Avg {round(_avg([u.points_earned_30d for u in m]))} pts/mo",
        "occasional": lambda m: f"Avg {round(_avg([u.sessions_per_week * 4.3 for u in m]), 1)} sessions/mo",
        "at_risk": lambda m: f"Avg {round(_avg([u.days_since_last_login for u in m]))} days inactive",
        "new_users": lambda m: f"Avg {round(_avg([u.tenure_days for u in m]))} days since signup",
        "phv_drivers": lambda m: f"Avg {round(_avg([u.trips_30d for u in m]))} trips/30d",
        "multi_vehicle": lambda m: f"Avg {round(_avg([u.vehicle_count for u in m]), 1)} vehicles",
        "web_unregistered": lambda m: f"Avg {round(_avg([u.sessions_per_week for u in m]), 1)} sessions/wk",
        "insurance_renewal_due": lambda m: f"Avg {round(_avg([u.days_to_insurance_expiry for u in m]))} days to expiry",
        "ev_owners": lambda m: "Electric vehicles",
        "high_mileage_drivers": lambda m: f"Avg {round(_avg([u.mileage_km for u in m]) / 1000)}k km",
    }

    out = []
    for key, label, criteria, recommendation in SEGMENT_DEFS:
        members = [u for u in users if predicates[key](u)]
        count = len(members)
        out.append({
            "key": key,
            "label": label,
            "criteria": criteria,
            "recommendation": recommendation,
            "detail": detail_fns[key](members) if members else "",
            "count": count,
            "pct": round(count / n * 100, 1),
            "members": _unique_member_names(members),
        })
    return {"total": len(users), "segments": out, "recommendation_source": "default"}


PREMIUM_BANDS = ["<1k", "1k-1.5k", "1.5k-2.5k", "2.5k-4k", "4k+"]
NCD_VALUES = ["0", "10", "20", "30", "40", "50"]
RENEWAL_BUCKETS = ["Expired", "0-30d", "31-60d", "61-90d", "91-180d", "181-365d", ">365d"]


def insurance(users: list[User]) -> dict[str, Any]:
    insured = [u for u in users if u.days_to_insurance_expiry != -1]
    n = len(users) or 1
    n_insured = len(insured) or 1
    premiums = [u.annual_premium_sgd for u in insured if u.annual_premium_sgd > 0]
    claims = [u.claims_3y for u in insured]
    with_claim = sum(1 for c in claims if c > 0)
    platform = sum(1 for u in insured if u.insured_via_platform)

    segment_premiums: dict[str, list[float]] = defaultdict(list)
    for u in insured:
        if u.annual_premium_sgd > 0:
            segment_premiums[u.primary_transport_mode].append(u.annual_premium_sgd)
    premium_by_segment = [
        {"label": label, "value": _avg(values), "count": len(values)}
        for label, values in sorted(segment_premiums.items(), key=lambda kv: len(kv[1]), reverse=True)
    ]

    def cohort(label: str, cond) -> dict[str, Any]:
        members = [u for u in insured if cond(u)]
        rate = round(sum(1 for u in members if u.claims_3y > 0) / len(members) * 100, 1) if members else 0.0
        return {"label": label, "value": rate, "count": len(members)}

    risk_cohorts = [
        cohort("PHV", lambda u: u.phv_licence),
        cohort("New drivers", lambda u: u.driver_experience.lower() == "new"),
        cohort("First car", lambda u: u.first_car),
        cohort("Night > 25%", lambda u: u.night_driving_pct > 25),
        cohort("High mileage", lambda u: u.mileage_km >= 60000),
    ]

    expiring_90 = [u for u in insured if 0 <= u.days_to_insurance_expiry <= 90]

    return {
        "total": len(users),
        "insured": len(insured),
        "insured_pct": round(len(insured) / n * 100, 1),
        "avg_premium": _avg(premiums),
        "median_premium": round(sorted(premiums)[len(premiums) // 2], 0) if premiums else 0.0,
        "total_premium": round(sum(premiums), 0),
        "platform_share_pct": round(platform / n_insured * 100, 1),
        "claim_rate_pct": round(with_claim / n_insured * 100, 1),
        "avg_claims": round(sum(claims) / n_insured, 2),
        "avg_ncd": _avg([u.ncd_pct for u in insured]),
        "value_at_stake": round(sum(u.annual_premium_sgd for u in expiring_90), 0),
        "expiring_90": len(expiring_90),
        "premium_bands": _distribution(insured, lambda u: _premium_band(u.annual_premium_sgd), PREMIUM_BANDS),
        "premium_by_segment": premium_by_segment,
        "insurer_mix": _distribution(insured, lambda u: u.insurer),
        "ncd_distribution": _distribution(insured, lambda u: str(u.ncd_pct), NCD_VALUES),
        "claims_distribution": _distribution(insured, lambda u: str(u.claims_3y), ["0", "1", "2"]),
        "renewal_pipeline": _distribution(insured, lambda u: _renewal_bucket(u.days_to_insurance_expiry), RENEWAL_BUCKETS),
        "risk_cohorts": risk_cohorts,
        "ev_vs_ice": {
            "ev": _avg([u.annual_premium_sgd for u in insured if u.fuel_type.upper() == "EV" and u.annual_premium_sgd > 0]),
            "ice": _avg([u.annual_premium_sgd for u in insured if u.fuel_type.upper() != "EV" and u.annual_premium_sgd > 0]),
        },
    }


def _cross_tab(users, row_key, col_key, row_order, col_order) -> dict[str, Any]:
    rows = []
    for r in row_order:
        row_users = [u for u in users if row_key(u) == r]
        rows.append({
            "row": r,
            "values": [
                {"label": c, "value": sum(1 for u in row_users if col_key(u) == c)}
                for c in col_order
            ],
        })
    return {"columns": col_order, "rows": rows}


def list_users(users: list[User], page: int, page_size: int, sort: str, order: str) -> dict[str, Any]:
    reverse = order.lower() == "desc"
    if sort:
        users = sorted(users, key=lambda u: getattr(u, sort, 0), reverse=reverse)
    total = len(users)
    start = (page - 1) * page_size
    page_items = users[start:start + page_size]
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, (total + page_size - 1) // page_size),
        "items": [user_to_dict(u) for u in page_items],
    }
