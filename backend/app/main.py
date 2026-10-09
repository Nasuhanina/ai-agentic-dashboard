"""FastAPI backend for the customer insights dashboard."""
from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

try:
    from . import config  # noqa: F401  (loads .env on import)
    from . import auth
    from . import propensity
    from . import recommender
    from .data import analytics
    from .data.generator import USERS, get_user, user_to_dict
except ImportError:
    import config  # noqa: F401  (loads .env on import)
    import auth
    import propensity
    import recommender
    from data import analytics
    from data.generator import USERS, get_user, user_to_dict

app = FastAPI(
    title="Customer Insights Dashboard API",
    version="1.0.0",
    description=(
        "Aggregated insights across demographics, in-app activity, CSO "
        "interactions, Sentiance SDK driving data, inferred sentiment and "
        "loyalty points."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


class FilterParams(BaseModel):
    city: str | None = None
    sentiment: str | None = None
    tier: str | None = None
    activity_status: str | None = None
    gender: str | None = None
    user_type: str | None = None
    age_band: str | None = None
    housing_type: str | None = None
    life_stage: str | None = None
    platform: str | None = None
    segment: str | None = None
    channel: str | None = None
    interaction_type: str | None = None
    login_recency: str | None = None
    tenure: str | None = None
    follow_up_recency: str | None = None
    driving_band: str | None = None
    insurer: str | None = None
    renewal: str | None = None
    premium_band: str | None = None
    ncd: str | None = None
    claims: str | None = None
    search: str | None = None


def get_current_account(authorization: str | None = Header(default=None)) -> auth.Account:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    account = auth.account_for_token(authorization[7:].strip())
    if account is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return account


def require_admin(account: auth.Account = Depends(get_current_account)) -> auth.Account:
    if account.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return account


def _filtered(f: FilterParams):
    return analytics.filter_users(
        city=f.city,
        sentiment=f.sentiment,
        tier=f.tier,
        activity_status=f.activity_status,
        gender=f.gender,
        user_type=f.user_type,
        age_band=f.age_band,
        housing_type=f.housing_type,
        life_stage=f.life_stage,
        platform=f.platform,
        segment=f.segment,
        channel=f.channel,
        interaction_type=f.interaction_type,
        login_recency=f.login_recency,
        tenure=f.tenure,
        follow_up_recency=f.follow_up_recency,
        driving_band=f.driving_band,
        insurer=f.insurer,
        renewal=f.renewal,
        premium_band=f.premium_band,
        ncd=f.ncd,
        claims=f.claims,
        search=f.search,
    )


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "users": len(USERS)}


@app.post("/api/login")
def login(payload: LoginRequest) -> dict:
    account = auth.authenticate(payload.username, payload.password)
    if account is None:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = auth.issue_token(account)
    return {
        "token": token,
        "role": account.role,
        "username": account.username,
        "name": account.name,
    }


@app.post("/api/logout")
def logout(authorization: str | None = Header(default=None)) -> dict:
    if authorization and authorization.lower().startswith("bearer "):
        auth.revoke_token(authorization[7:].strip())
    return {"status": "ok"}


@app.get("/api/me")
def me(account: auth.Account = Depends(get_current_account)) -> dict:
    return {"role": account.role, "username": account.username, "name": account.name}


@app.get("/api/filters")
def filters(_account: auth.Account = Depends(get_current_account)) -> dict:
    def uniq(attr: str) -> list[str]:
        return sorted({getattr(u, attr) for u in USERS})

    return {
        "cities": uniq("city"),
        "sentiments": uniq("sentiment"),
        "tiers": uniq("loyalty_tier"),
        "activity_statuses": uniq("activity_status"),
        "genders": uniq("gender"),
        "user_types": uniq("user_type"),
    }


@app.get("/api/summary")
def get_summary(f: FilterParams = Depends(), _account: auth.Account = Depends(get_current_account)):
    return analytics.summary(_filtered(f))


@app.get("/api/demographics")
def get_demographics(f: FilterParams = Depends(), _account: auth.Account = Depends(get_current_account)):
    return analytics.demographics(_filtered(f))


@app.get("/api/activity")
def get_activity(f: FilterParams = Depends(), _account: auth.Account = Depends(get_current_account)):
    return analytics.activity(_filtered(f))


@app.get("/api/interactions")
def get_interactions(f: FilterParams = Depends(), _account: auth.Account = Depends(require_admin)):
    return analytics.interactions(_filtered(f))


@app.get("/api/driving-insights")
def get_driving_insights(f: FilterParams = Depends(), _account: auth.Account = Depends(get_current_account)):
    return analytics.driving_insights(_filtered(f))


@app.get("/api/sentiment")
def get_sentiment(f: FilterParams = Depends(), _account: auth.Account = Depends(require_admin)):
    return analytics.sentiment(_filtered(f))


@app.get("/api/loyalty")
def get_loyalty(f: FilterParams = Depends(), _account: auth.Account = Depends(get_current_account)):
    return analytics.loyalty(_filtered(f))


@app.get("/api/insurance")
def get_insurance(f: FilterParams = Depends(), _account: auth.Account = Depends(require_admin)):
    return analytics.insurance(_filtered(f))


@app.get("/api/segments")
def get_segments(
    f: FilterParams = Depends(),
    ai: bool = False,
    _account: auth.Account = Depends(require_admin),
):
    result = analytics.segments(_filtered(f))
    return recommender.apply(result) if ai else result


# --- Likelihood to buy + campaign builder (see propensity.py) -----------------

def _allowed_ids(f: FilterParams) -> set[str] | None:
    """Ids passing the global filter bar, or None when no filter is set."""
    if not any(v for v in f.model_dump().values()):
        return None
    return {u.id for u in _filtered(f)}


def _check_product(product: str, allow_any: bool = True) -> None:
    valid = set(propensity.PRODUCTS) | ({"", propensity.APP_DOWNLOAD} if allow_any else set())
    if product not in valid:
        raise HTTPException(status_code=400, detail=f"Unknown product '{product}'")


@app.get("/api/propensity/meta")
def get_propensity_meta(_account: auth.Account = Depends(require_admin)) -> dict:
    return {**propensity.meta(), "history": propensity.history() if propensity.available() else None}


@app.get("/api/propensity/users")
def get_propensity_users(
    product: str = "",
    min_pct: float = Query(0, ge=0, le=100),
    group: str = "",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    sort: str = Query("likelihood"),
    f: FilterParams = Depends(),
    _account: auth.Account = Depends(require_admin),
):
    if not propensity.available():
        raise HTTPException(status_code=503, detail="Likelihood model needs customer360.csv")
    _check_product(product)
    ids = _allowed_ids(f)
    return propensity.users(ids, product, min_pct, group, page, page_size, sort)


@app.get("/api/propensity/users/{user_id}")
def get_propensity_user(user_id: str, _account: auth.Account = Depends(require_admin)):
    result = propensity.user(user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="User not found")
    return result


@app.get("/api/campaign")
def get_campaign(
    product: str = "insurance_switch",
    group: str = "",
    message_channel: str = "WhatsApp",
    offer: str = "No offer",
    min_pct: float = Query(20, ge=0, le=100),
    f: FilterParams = Depends(),
    _account: auth.Account = Depends(require_admin),
):
    if not propensity.available():
        raise HTTPException(status_code=503, detail="Campaign builder needs customer360.csv")
    _check_product(product, allow_any=False)
    if message_channel not in propensity.CHANNELS or offer not in propensity.OFFERS:
        raise HTTPException(status_code=400, detail="Unknown channel or offer")
    ids = _allowed_ids(f)
    return propensity.campaign(ids, product, group, message_channel, offer, min_pct)


@app.get("/api/campaign/audience.csv", response_class=PlainTextResponse)
def get_campaign_audience(
    product: str = "insurance_switch",
    group: str = "",
    message_channel: str = "WhatsApp",
    offer: str = "No offer",
    min_pct: float = Query(20, ge=0, le=100),
    f: FilterParams = Depends(),
    _account: auth.Account = Depends(require_admin),
):
    if not propensity.available():
        raise HTTPException(status_code=503, detail="Campaign builder needs customer360.csv")
    _check_product(product, allow_any=False)
    ids = _allowed_ids(f)
    return propensity.audience_csv(ids, product, group, message_channel, offer, min_pct)


@app.get("/api/users")
def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort: str = Query("loyalty_points"),
    order: str = Query("desc"),
    f: FilterParams = Depends(),
    _account: auth.Account = Depends(require_admin),
):
    users = _filtered(f)
    return analytics.list_users(users, page, page_size, sort, order)


@app.get("/api/users/{user_id}")
def get_user_detail(user_id: str, _account: auth.Account = Depends(require_admin)):
    user = get_user(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user_to_dict(user)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
