"""Deterministic mock data generator for the customer insights dashboard.

The data models here are intentionally rich so that the API can answer
questions across all requested areas:

* Demographics
* In-app activity (tenure, last login, sessions)
* Past interactions with the platform / CSO (last follow-up date, tickets)
* Driving insights derived from the Sentiance SDK
* Inferred user sentiment
* Loyalty point trends
"""
from __future__ import annotations

import csv
import math
import os
import random
import zlib
from dataclasses import dataclass, field, asdict
from datetime import date, datetime, timedelta
from typing import Any

SEED = 20240607
TODAY = date(2026, 10, 9)
ASSUMED_AVG_SPEED_KMPH = 30.0

GENDERS = ["Male", "Female", "Other"]
AGE_BANDS = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]
OCCUPATIONS = [
    "Software Engineer",
    "Teacher",
    "Nurse",
    "Sales Manager",
    "Freelancer",
    "Accountant",
    "Retired",
    "Student",
    "Driver",
    "Consultant",
]
INCOME_BANDS = ["<2k", "2k-5k", "5k-10k", "10k-20k", ">20k"]
CITIES = [
    ("Singapore", "Central"),
    ("Singapore", "East"),
    ("Singapore", "West"),
    ("Singapore", "North"),
    ("Singapore", "North-East"),
    ("Kuala Lumpur", "Central"),
    ("Jakarta", "South"),
    ("Bangkok", "Sukhumvit"),
    ("Manila", "Makati"),
]
PLATFORMS = ["iOS", "Android"]
TIERS = ["Bronze", "Silver", "Gold", "Platinum"]
SENTIMENTS = ["Positive", "Neutral", "Negative"]
CHANNELS = ["Call", "Email", "Live Chat", "CSO Visit", "In-App"]
INTERACTION_TYPES = [
    "Onboarding",
    "KYC Check",
    "Billing Query",
    "Feature Help",
    "Complaint",
    "Renewal",
    "Feedback",
]
TRANSPORT_MODES = ["Car", "Motorcycle", "Bicycle", "Walk", "Public Transport"]

SENTIMENT_DRIVERS = {
    "Positive": [
        "smooth app experience",
        "fast payouts",
        "helpful CSO",
        "reliable tracking",
        "good incentives",
        "accurate trip stats",
    ],
    "Neutral": [
        "standard usage",
        "occasional notifications",
        "average trip volume",
        "no recent contact",
    ],
    "Negative": [
        "app crash on login",
        "delayed support response",
        "unclear loyalty rules",
        "battery drain",
        "missed trip detection",
    ],
}

FIRST_NAMES = [
    "Aisha", "Wei", "Daniel", "Priya", "Hafiz", "Mei", "Arjun", "Nurul",
    "Marcus", "Siti", "Jin", "Fatih", "Grace", "Rahul", "Lena", "Tariq",
    "Sofia", "Ken", "Aisha", "Diego", "Yuna", "Omar", "Chloe", "Vikram",
]
LAST_NAMES = [
    "Tan", "Lim", "Wong", "Rahman", "Kumar", "Lee", "Nguyen", "Santos",
    "Ibrahim", "Chua", "Goh", "Sharma", "Dela Cruz", "Putra", "Ong", "Yeo",
]


def _age_band(age: int) -> str:
    if age < 25:
        return "18-24"
    if age < 35:
        return "25-34"
    if age < 45:
        return "35-44"
    if age < 55:
        return "45-54"
    if age < 65:
        return "55-64"
    return "65+"


@dataclass
class User:
    id: str
    name: str
    email: str
    avatar_seed: int
    user_type: str

    # Demographics
    age: int
    age_band: str
    gender: str
    occupation: str
    income_band: str
    city: str
    region: str
    household_size: int

    # In-app activity
    tenure_days: int
    tenure_start: str
    last_login: str
    days_since_last_login: int
    logins_30d: int
    sessions_per_week: float
    avg_session_minutes: float
    platform: str
    app_version: str
    activity_status: str

    # Interactions with platform / CSO
    total_interactions: int
    last_follow_up: str
    days_since_follow_up: int
    last_interaction_channel: str
    last_interaction_type: str
    open_tickets: int
    satisfaction_csat: float
    follow_up_needed: bool

    # Driving insights (Sentiance SDK)
    driving_score: int
    trips_30d: int
    total_km_30d: float
    avg_trip_distance_km: float
    avg_trip_duration_min: float
    night_driving_pct: float
    harsh_braking_30d: int
    harsh_acceleration_30d: int
    speeding_30d: int
    phone_usage_events_30d: int
    primary_transport_mode: str
    transport_mode_mix: dict[str, float]
    phv_licence: bool
    vehicle_count: int
    days_to_insurance_expiry: int
    fuel_type: str
    mileage_km: int
    annual_premium_sgd: float
    ncd_pct: int
    claims_3y: int
    insurer: str
    insured_via_platform: bool
    first_car: bool
    driver_experience: str

    # Sentiment
    sentiment: str
    sentiment_score: float
    sentiment_trend: list[float]
    sentiment_drivers: list[str]

    # Loyalty
    loyalty_points: int
    loyalty_tier: str
    points_earned_30d: int
    points_redeemed_30d: int
    points_trend: list[dict[str, Any]]
    next_tier_points: int


def _weighted_choice(rng: random.Random, options, weights):
    return rng.choices(options, weights=weights, k=1)[0]


def _make_points_trend(rng: random.Random, current_points: int, profile: str) -> list[dict[str, Any]]:
    """12 monthly points snapshots ending at ``current_points``."""
    n = 12
    slope = {"loyal": 150, "steady": 60, "declining": -40, "churny": -120}[profile]
    start = max(0, current_points - slope * (n - 1) - rng.randint(-200, 200))
    series = []
    val = start
    for i in range(n):
        val = max(0, val + slope + rng.randint(-60, 60))
        month = (TODAY.replace(day=1) - timedelta(days=30 * (n - 1 - i)))
        series.append({"month": month.strftime("%Y-%m"), "points": int(val)})
    # pin the last value so it matches the headline number
    series[-1]["points"] = current_points
    return series


def _make_sentiment_trend(rng: random.Random, base: float) -> list[float]:
    return [round(min(1.0, max(-1.0, base + rng.uniform(-0.15, 0.15))), 2) for _ in range(8)]


def generate_users(count: int = 240) -> list[User]:
    rng = random.Random(SEED)
    users: list[User] = []

    for i in range(count):
        age = int(min(75, max(18, rng.gauss(41, 13))))
        city, region = rng.choice(CITIES)
        first = rng.choice(FIRST_NAMES)
        last = rng.choice(LAST_NAMES)
        name = f"{first} {last}"
        email = f"{first.lower()}.{last.lower().replace(' ', '')}{i}@example.com"

        # --- activity -------------------------------------------------
        tenure_days = int(rng.gauss(420, 260))
        tenure_days = max(3, min(2200, tenure_days))
        tenure_start = TODAY - timedelta(days=tenure_days)

        # Mixture so we get a realistic spread of active -> at-risk cohorts.
        if rng.random() < 0.72:
            days_since_last_login = int(abs(rng.gauss(3, 4)))
        else:
            days_since_last_login = int(abs(rng.gauss(45, 28)))
        days_since_last_login = min(days_since_last_login, tenure_days)
        last_login = TODAY - timedelta(days=days_since_last_login)

        sessions_per_week = round(max(0.1, rng.gauss(6, 4)), 1)
        logins_30d = int(max(0, rng.gauss(sessions_per_week * 4.3, 6)))
        avg_session_minutes = round(max(1.0, rng.gauss(9, 5)), 1)

        if days_since_last_login <= 3:
            activity_status = "Active"
        elif days_since_last_login <= 14:
            activity_status = "Occasional"
        elif days_since_last_login <= 45:
            activity_status = "Dormant"
        else:
            activity_status = "At Risk"

        # --- interactions --------------------------------------------
        total_interactions = int(abs(rng.gauss(4, 4)))
        days_since_follow_up = int(abs(rng.gauss(30, 35)))
        days_since_follow_up = min(days_since_follow_up, tenure_days)
        last_follow_up = TODAY - timedelta(days=days_since_follow_up)
        channel = _weighted_choice(rng, CHANNELS, [3, 4, 4, 1, 3])
        interaction_type = rng.choice(INTERACTION_TYPES)
        open_tickets = _weighted_choice(rng, [0, 1, 2, 3], [6, 3, 1, 1])
        csat = round(min(5.0, max(1.0, rng.gauss(4.0, 0.9))), 1)
        follow_up_needed = days_since_follow_up > 45 or open_tickets >= 2

        # --- driving insights ----------------------------------------
        driving_score = int(min(100, max(20, rng.gauss(72, 15))))
        trips_30d = int(abs(rng.gauss(38, 22)))
        avg_trip_distance_km = round(max(1.0, rng.gauss(11, 6)), 1)
        total_km_30d = round(trips_30d * avg_trip_distance_km, 1)
        avg_trip_duration_min = round(max(3.0, rng.gauss(24, 10)), 1)
        night_driving_pct = round(min(90, max(0, rng.gauss(22, 16))), 1)
        harsh_braking = int(abs(rng.gauss(9, 7)))
        harsh_accel = int(abs(rng.gauss(7, 6)))
        speeding = int(abs(rng.gauss(5, 5)))
        phone_usage = int(abs(rng.gauss(3, 4)))

        primary_mode = _weighted_choice(
            rng, TRANSPORT_MODES, [55, 18, 6, 8, 13]
        )
        raw_mix = {m: rng.uniform(0, 1) for m in TRANSPORT_MODES}
        raw_mix[primary_mode] += 3
        s = sum(raw_mix.values())
        transport_mix = {m: round(v / s, 3) for m, v in raw_mix.items()}

        # --- sentiment -----------------------------------------------
        # Derived loosely from csat, activity and driving behaviour, then
        # rescaled around zero so positive/neutral/negative are all present.
        composite = (
            0.45 * ((csat - 3.9) / 1.0)
            + 0.25 * ((30 - min(days_since_last_login, 90)) / 30)
            + 0.20 * ((driving_score - 72) / 15)
            - 0.20 * (min(open_tickets, 4) / 4 - 0.25)
            + rng.uniform(-0.6, 0.6)
        )
        if composite > 0.2:
            sentiment = "Positive"
        elif composite < -0.2:
            sentiment = "Negative"
        else:
            sentiment = "Neutral"
        sentiment_score = round(max(-1.0, min(1.0, composite)), 2)
        drivers = rng.sample(SENTIMENT_DRIVERS[sentiment], k=min(3, len(SENTIMENT_DRIVERS[sentiment])))
        sentiment_trend = _make_sentiment_trend(rng, sentiment_score)

        # --- loyalty --------------------------------------------------
        loyalty_points = int(abs(rng.gauss(4200, 3200)))
        loyalty_tier = (
            "Platinum" if loyalty_points >= 8000
            else "Gold" if loyalty_points >= 4500
            else "Silver" if loyalty_points >= 2000
            else "Bronze"
        )
        points_earned_30d = int(abs(rng.gauss(320, 220)))
        points_redeemed_30d = int(abs(rng.gauss(140, 180)))
        if days_since_last_login <= 7 and sentiment == "Positive":
            profile = "loyal"
        elif sentiment == "Negative":
            profile = "churny" if rng.random() < 0.5 else "declining"
        else:
            profile = "steady"
        points_trend = _make_points_trend(rng, loyalty_points, profile)
        next_tier_points = (
            2000 if loyalty_tier == "Bronze"
            else 4500 if loyalty_tier == "Silver"
            else 8000 if loyalty_tier == "Gold"
            else 8000
        )

        users.append(
            User(
                id=f"U{i + 1:04d}",
                name=name,
                email=email,
                avatar_seed=rng.randint(1, 70),
                user_type="App user",
                age=age,
                age_band=_age_band(age),
                gender=_weighted_choice(rng, GENDERS, [48, 48, 4]),
                occupation=rng.choice(OCCUPATIONS),
                income_band=_weighted_choice(rng, INCOME_BANDS, [15, 30, 28, 18, 9]),
                city=city,
                region=region,
                household_size=_weighted_choice(rng, [1, 2, 3, 4, 5, 6], [15, 25, 22, 20, 12, 6]),
                tenure_days=tenure_days,
                tenure_start=tenure_start.isoformat(),
                last_login=last_login.isoformat(),
                days_since_last_login=days_since_last_login,
                logins_30d=logins_30d,
                sessions_per_week=sessions_per_week,
                avg_session_minutes=avg_session_minutes,
                platform=_weighted_choice(rng, PLATFORMS, [52, 48]),
                app_version=rng.choice(["3.4.1", "3.4.0", "3.3.2", "3.5.0-beta"]),
                activity_status=activity_status,
                total_interactions=total_interactions,
                last_follow_up=last_follow_up.isoformat(),
                days_since_follow_up=days_since_follow_up,
                last_interaction_channel=channel,
                last_interaction_type=interaction_type,
                open_tickets=open_tickets,
                satisfaction_csat=csat,
                follow_up_needed=follow_up_needed,
                driving_score=driving_score,
                trips_30d=trips_30d,
                total_km_30d=total_km_30d,
                avg_trip_distance_km=avg_trip_distance_km,
                avg_trip_duration_min=avg_trip_duration_min,
                night_driving_pct=night_driving_pct,
                harsh_braking_30d=harsh_braking,
                harsh_acceleration_30d=harsh_accel,
                speeding_30d=speeding,
                phone_usage_events_30d=phone_usage,
                primary_transport_mode=primary_mode,
                transport_mode_mix=transport_mix,
                phv_licence=False,
                vehicle_count=1,
                days_to_insurance_expiry=365,
                fuel_type="Petrol",
                mileage_km=0,
                annual_premium_sgd=0.0,
                ncd_pct=0,
                claims_3y=0,
                insurer="Unknown",
                insured_via_platform=False,
                first_car=False,
                driver_experience="Experienced",
                sentiment=sentiment,
                sentiment_score=sentiment_score,
                sentiment_trend=sentiment_trend,
                sentiment_drivers=drivers,
                loyalty_points=loyalty_points,
                loyalty_tier=loyalty_tier,
                points_earned_30d=points_earned_30d,
                points_redeemed_30d=points_redeemed_30d,
                points_trend=points_trend,
                next_tier_points=next_tier_points,
            )
        )

    return users


def _cell(row: dict, key: str) -> str:
    return (row.get(key) or "").strip()


def _num(row: dict, key: str, default: float = 0.0) -> float:
    raw = _cell(row, key)
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _int(row: dict, key: str, default: int = 0) -> int:
    return int(round(_num(row, key, default)))


def _flag(row: dict, key: str) -> bool:
    return _cell(row, key).upper() == "Y"


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _days_since(iso: str) -> int | None:
    if not iso:
        return None
    try:
        d = datetime.strptime(iso, "%Y-%m-%d").date()
    except ValueError:
        return None
    return max(0, (TODAY - d).days)


def _month_label(offset: int) -> str:
    year, month = TODAY.year, TODAY.month - offset
    while month <= 0:
        month += 12
        year -= 1
    return f"{year:04d}-{month:02d}"


def _tier_for(points: int) -> tuple[str, int]:
    if points >= 1000:
        return "Platinum", 1000
    if points >= 600:
        return "Gold", 1000
    if points >= 300:
        return "Silver", 600
    return "Bronze", 300


def _csv_candidates() -> list[str]:
    here = os.path.dirname(os.path.abspath(__file__))
    return [
        os.environ.get("CUSTOMER360_CSV", ""),
        os.path.join(here, "customer360.csv"),
        os.path.join(here, "..", "..", "..", "customer360.csv"),
        os.path.join(here, "..", "..", "customer360.csv"),
    ]


def _row_to_user(row: dict) -> User:
    cid = _cell(row, "customer_id")
    seed = zlib.crc32(cid.encode()) if cid else zlib.crc32(repr(row).encode())
    if not cid:
        cid = f"U{seed:07d}"
    name = _cell(row, "full_name") or cid
    age = _int(row, "age", 42) or 42

    raw_type = _cell(row, "user_type")
    user_type = raw_type or "Unknown"

    signup_iso = _cell(row, "signup_date") or _cell(row, "first_web_visit_date")
    login_iso = _cell(row, "last_login_date") or _cell(row, "last_web_visit_date")
    tenure_days = _days_since(signup_iso)
    if tenure_days is None:
        tenure_days = _int(row, "tenure_days", 1)
    tenure_days = max(1, tenure_days)
    dsl = _days_since(login_iso)
    if dsl is None:
        dsl = _int(row, "days_since_last_login", 0)
    logins_30d = _int(row, "logins_last_30d", 0)

    app_sessions = _num(row, "app_sessions_m1", 0.0)
    web_sessions = _num(row, "web_sessions_90d", 0.0)
    if app_sessions:
        sessions_per_week = round(max(0.0, app_sessions / 4.3), 1)
    elif web_sessions:
        sessions_per_week = round(web_sessions / (90 / 7), 1)
    else:
        sessions_per_week = round(max(0.0, logins_30d / 4.3), 1)
    avg_session_minutes = round(_num(row, "avg_time_on_site_sec", 0.0) / 60, 1)

    if dsl <= 3:
        activity_status = "Active"
    elif dsl <= 14:
        activity_status = "Occasional"
    elif dsl <= 45:
        activity_status = "Dormant"
    else:
        activity_status = "At Risk"

    total_interactions = _int(row, "cso_tickets_12m", 0)
    cso_days = _days_since(_cell(row, "last_followup_date"))
    if cso_days is None:
        cso_days = _days_since(_cell(row, "last_cso_ticket_date"))
    follow_up = cso_days if cso_days is not None else dsl
    open_tickets = 1 if _flag(row, "cso_ticket_open") else 0
    csat = _num(row, "csat_last_ticket", 0.0) or _num(row, "in_app_feedback_rating", 0.0)
    follow_up_needed = bool(open_tickets) or (cso_days is not None and cso_days > 45)

    driving_score = _int(row, "driving_score", 0)
    trips_30d = int(round(_num(row, "trips_90d", 0.0) / 3))
    total_km_30d = round(_num(row, "km_driven_90d", 0.0) / 3, 1)
    avg_trip_distance_km = round(total_km_30d / trips_30d, 1) if trips_30d else 0.0
    avg_trip_duration_min = (
        round(avg_trip_distance_km / ASSUMED_AVG_SPEED_KMPH * 60, 1) if avg_trip_distance_km else 0.0
    )
    night_driving_pct = _num(row, "night_driving_pct", 0.0)
    harsh_braking_30d = int(round(_num(row, "harsh_braking_events_90d", 0.0) / 3))

    signals = []
    if csat:
        signals.append((csat - 3.0) / 2.0)
    feedback = _num(row, "in_app_feedback_rating", 0.0)
    if feedback:
        signals.append((feedback - 3.0) / 2.0)
    base = sum(signals) / len(signals) if signals else 0.0
    base -= 0.15 * _num(row, "claims_3y", 0.0)
    base -= 0.05 * _num(row, "fines_12m", 0.0)
    base += 0.1 * ((driving_score - 76) / 20) if driving_score else 0.0
    sentiment_score = round(_clamp(base, -1.0, 1.0), 2)
    if sentiment_score > 0.15:
        sentiment = "Positive"
    elif sentiment_score < -0.15:
        sentiment = "Negative"
    else:
        sentiment = "Neutral"
    srng = random.Random(seed)
    sentiment_trend = [
        round(_clamp(sentiment_score + srng.uniform(-0.2, 0.2), -1.0, 1.0), 2) for _ in range(8)
    ]
    sentiment_drivers = srng.sample(
        SENTIMENT_DRIVERS[sentiment], k=min(3, len(SENTIMENT_DRIVERS[sentiment]))
    )

    loyalty_points = _int(row, "mpoints_balance", 0)
    loyalty_tier, next_tier_points = _tier_for(loyalty_points)
    points_earned_30d = int(round(_num(row, "mpoints_earned_12m", 0.0) / 12))
    points_redeemed_30d = int(round(_num(row, "mpoints_redeemed_12m", 0.0) / 12))
    points_trend = [
        {
            "month": _month_label(5 - i),
            "points": _int(row, f"mpoints_m{5 - i + 1}", loyalty_points),
        }
        for i in range(6)
    ]

    slug = "".join(ch for ch in name.lower() if ch.isalnum())[:20] or "customer"

    return User(
        id=cid,
        name=name,
        email=f"{slug}.{cid.lower()}@example.com",
        avatar_seed=(seed % 70) + 1,
        user_type=user_type,
        age=age,
        age_band=_age_band(age),
        gender=_cell(row, "gender") or "Other",
        occupation=_cell(row, "life_stage") or "Unknown",
        income_band=_cell(row, "housing_type") or "Unknown",
        city=_cell(row, "planning_area").title() or "Unknown",
        region=_cell(row, "region") or "Unknown",
        household_size=2 if _flag(row, "has_children_proxy") else 1,
        tenure_days=tenure_days,
        tenure_start=signup_iso or (TODAY - timedelta(days=tenure_days)).isoformat(),
        last_login=login_iso or (TODAY - timedelta(days=dsl)).isoformat(),
        days_since_last_login=dsl,
        logins_30d=logins_30d,
        sessions_per_week=sessions_per_week,
        avg_session_minutes=avg_session_minutes,
        platform=_cell(row, "device_os") or "Unknown",
        app_version=_cell(row, "device_os") or "n/a",
        activity_status=activity_status,
        total_interactions=total_interactions,
        last_follow_up=_cell(row, "last_followup_date") or _cell(row, "last_cso_ticket_date"),
        days_since_follow_up=follow_up,
        last_interaction_channel=_cell(row, "last_cso_channel") or "None",
        last_interaction_type=_cell(row, "last_cso_topic") or "None",
        open_tickets=open_tickets,
        satisfaction_csat=round(csat, 1),
        follow_up_needed=follow_up_needed,
        driving_score=driving_score,
        trips_30d=trips_30d,
        total_km_30d=total_km_30d,
        avg_trip_distance_km=avg_trip_distance_km,
        avg_trip_duration_min=avg_trip_duration_min,
        night_driving_pct=round(night_driving_pct, 1),
        harsh_braking_30d=harsh_braking_30d,
        harsh_acceleration_30d=0,
        speeding_30d=0,
        phone_usage_events_30d=0,
        primary_transport_mode=_cell(row, "vehicle_segment") or "Unknown",
        transport_mode_mix={},
        phv_licence=_flag(row, "phv_licence"),
        vehicle_count=max(1, _int(row, "vehicle_count", 1)),
        days_to_insurance_expiry=_int(row, "days_to_insurance_expiry", -1),
        fuel_type=_cell(row, "fuel_type") or "Unknown",
        mileage_km=_int(row, "mileage_km", 0),
        annual_premium_sgd=_num(row, "annual_premium_sgd", 0.0),
        ncd_pct=_int(row, "ncd_pct", 0),
        claims_3y=_int(row, "claims_3y", 0),
        insurer=_cell(row, "insurer") or "Unknown",
        insured_via_platform=_flag(row, "insured_via_platform"),
        first_car=_flag(row, "first_car"),
        driver_experience=_cell(row, "driver_experience") or "Unknown",
        sentiment=sentiment,
        sentiment_score=sentiment_score,
        sentiment_trend=sentiment_trend,
        sentiment_drivers=sentiment_drivers,
        loyalty_points=loyalty_points,
        loyalty_tier=loyalty_tier,
        points_earned_30d=points_earned_30d,
        points_redeemed_30d=points_redeemed_30d,
        points_trend=points_trend,
        next_tier_points=next_tier_points,
    )


def load_users_from_csv(path: str | None) -> list[User]:
    if not path or not os.path.isfile(path):
        return []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        return []
    return [_row_to_user(r) for r in rows]


def _discover_csv() -> str | None:
    for candidate in _csv_candidates():
        if candidate and os.path.isfile(candidate):
            return candidate
    return None


# Real data when customer360.csv is available; otherwise the seeded mock set.
_CSV_PATH = _discover_csv()
CSV_USERS: list[User] = load_users_from_csv(_CSV_PATH)
USERS: list[User] = CSV_USERS or generate_users()


def user_to_dict(u: User) -> dict[str, Any]:
    return asdict(u)


def get_user(user_id: str) -> User | None:
    for u in USERS:
        if u.id == user_id:
            return u
    return None
