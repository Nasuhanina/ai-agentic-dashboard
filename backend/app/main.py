"""FastAPI backend for the customer insights dashboard."""
from __future__ import annotations

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from . import config  # noqa: F401  (loads .env on import)
    from . import auth
    from . import recommender
    from .data import analytics
    from .data.generator import USERS, get_user, user_to_dict
except ImportError:
    import config  # noqa: F401  (loads .env on import)
    import auth
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


def _filtered(
    city: str | None,
    sentiment: str | None,
    tier: str | None,
    activity_status: str | None,
    gender: str | None,
    user_type: str | None,
    search: str | None,
):
    return analytics.filter_users(
        city=city,
        sentiment=sentiment,
        tier=tier,
        activity_status=activity_status,
        gender=gender,
        user_type=user_type,
        search=search,
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
def get_summary(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    search: str | None = None,
    user_type: str | None = None,
    _account: auth.Account = Depends(get_current_account),
):
    return analytics.summary(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))


@app.get("/api/demographics")
def get_demographics(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    search: str | None = None,
    user_type: str | None = None,
    _account: auth.Account = Depends(get_current_account),
):
    return analytics.demographics(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))


@app.get("/api/activity")
def get_activity(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    search: str | None = None,
    user_type: str | None = None,
    _account: auth.Account = Depends(get_current_account),
):
    return analytics.activity(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))


@app.get("/api/interactions")
def get_interactions(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    search: str | None = None,
    user_type: str | None = None,
    _account: auth.Account = Depends(require_admin),
):
    return analytics.interactions(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))


@app.get("/api/driving-insights")
def get_driving_insights(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    search: str | None = None,
    user_type: str | None = None,
    _account: auth.Account = Depends(get_current_account),
):
    return analytics.driving_insights(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))


@app.get("/api/sentiment")
def get_sentiment(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    search: str | None = None,
    user_type: str | None = None,
    _account: auth.Account = Depends(require_admin),
):
    return analytics.sentiment(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))


@app.get("/api/loyalty")
def get_loyalty(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    search: str | None = None,
    user_type: str | None = None,
    _account: auth.Account = Depends(get_current_account),
):
    return analytics.loyalty(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))


@app.get("/api/insurance")
def get_insurance(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    user_type: str | None = None,
    search: str | None = None,
    _account: auth.Account = Depends(require_admin),
):
    return analytics.insurance(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))


@app.get("/api/segments")
def get_segments(
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    user_type: str | None = None,
    search: str | None = None,
    ai: bool = False,
    _account: auth.Account = Depends(require_admin),
):
    result = analytics.segments(_filtered(city, sentiment, tier, activity_status, gender, user_type, search))
    return recommender.apply(result) if ai else result


@app.get("/api/users")
def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    sort: str = Query("loyalty_points"),
    order: str = Query("desc"),
    city: str | None = None,
    sentiment: str | None = None,
    tier: str | None = None,
    activity_status: str | None = None,
    gender: str | None = None,
    search: str | None = None,
    user_type: str | None = None,
    _account: auth.Account = Depends(require_admin),
):
    users = _filtered(city, sentiment, tier, activity_status, gender, user_type, search)
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
