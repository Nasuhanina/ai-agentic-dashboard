"""Lightweight in-memory auth with two demo roles (admin, customer).

Credentials are hard-coded and tokens live only in memory, so restarting the
server signs everyone out. Replace this module with a real identity provider
when wiring up production authentication.
"""
from __future__ import annotations

import secrets
from dataclasses import dataclass


@dataclass(frozen=True)
class Account:
    username: str
    password: str
    role: str
    name: str


ACCOUNTS: dict[str, Account] = {
    "admin": Account("admin", "admin123", "admin", "Admin"),
    "customer": Account("customer", "customer123", "customer", "Sample Customer"),
}

_TOKENS: dict[str, Account] = {}


def authenticate(username: str, password: str) -> Account | None:
    account = ACCOUNTS.get(username)
    if account is None or account.password != password:
        return None
    return account


def issue_token(account: Account) -> str:
    token = secrets.token_urlsafe(24)
    _TOKENS[token] = account
    return token


def account_for_token(token: str) -> Account | None:
    return _TOKENS.get(token)


def revoke_token(token: str) -> None:
    _TOKENS.pop(token, None)
