"""Canonicalize raw /api/products rows and strictly validate the K-means features."""
from __future__ import annotations

import math
from typing import Any


class ValidationError(ValueError):
    pass


def _finite_number(value: Any, field: str, *, integer: bool = False) -> float | int:
    if isinstance(value, bool) or value is None:
        raise ValidationError(f"{field}: expected a finite number")
    if isinstance(value, str):
        if not value.strip():
            raise ValidationError(f"{field}: blank value")
        value = value.strip()
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValidationError(f"{field}: malformed number")
    if not math.isfinite(number):
        raise ValidationError(f"{field}: must be finite")
    if number < 0:
        raise ValidationError(f"{field}: must be non-negative")
    if integer and number != int(number):
        raise ValidationError(f"{field}: must be an integer")
    return int(number) if integer else number


def _text(value: Any, field: str, *, required: bool = False) -> str:
    if value is None:
        if required:
            raise ValidationError(f"{field}: missing")
        return ""
    text = str(value).strip()
    if required and not text:
        raise ValidationError(f"{field}: blank")
    return text


def canonicalize(row: dict[str, Any]) -> dict[str, Any]:
    """Map one Inventory row (id, name, stock, category, price, ...) to canonical shape."""
    product_id = _text(row.get("id"), "id", required=True)
    stock = _finite_number(row.get("stock"), "stock", integer=True)
    price = _finite_number(row.get("price"), "price")
    return {
        "product_key": product_id,
        "name": _text(row.get("name"), "name", required=True),
        "category": _text(row.get("category"), "category"),
        "brand": _text(row.get("brand"), "brand"),
        "location": _text(row.get("location"), "location"),
        "status": _text(row.get("status"), "status"),
        "price": price,
        "stock": stock,
    }


def normalize_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    accepted: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, row in enumerate(rows):
        try:
            if not isinstance(row, dict):
                raise ValidationError("row: expected object")
            record = canonicalize(row)
            if record["product_key"] in seen:
                raise ValidationError("duplicate product id")
            seen.add(record["product_key"])
            accepted.append(record)
        except ValidationError as exc:
            rejected.append({"row_index": index, "reason": str(exc)})
    return accepted, rejected
