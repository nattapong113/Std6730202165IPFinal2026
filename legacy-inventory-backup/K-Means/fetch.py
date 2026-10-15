"""Fetch inventory products from this project's own Express API.

This is the same endpoint the app itself calls (see ../server.js,
``GET /api/products``) - no external or mock sources are involved.
"""
from __future__ import annotations

from typing import Any

import requests

MAX_RESPONSE_BYTES = 5_000_000


class FetchError(RuntimeError):
    pass


def fetch_products(api_base: str, *, timeout: float = 8.0) -> list[dict[str, Any]]:
    url = api_base.rstrip("/") + "/api/products"
    try:
        response = requests.get(url, timeout=(timeout, timeout), headers={"Accept": "application/json"})
    except requests.RequestException as exc:
        raise FetchError(f"could not reach {url}: {exc}") from exc
    if response.status_code >= 400:
        raise FetchError(f"{url} returned HTTP {response.status_code}")
    if len(response.content) > MAX_RESPONSE_BYTES:
        raise FetchError("response exceeds size limit")
    try:
        payload = response.json()
    except ValueError as exc:
        raise FetchError("response is not valid JSON") from exc
    if not isinstance(payload, list):
        raise FetchError("expected a JSON array of products")
    return payload
