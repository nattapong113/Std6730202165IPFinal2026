"""Fetch Inventory products from the live API and cluster them by price/stock.

Requires the Express server to be running (``node server.js`` from the
project root) so ``GET /api/products`` is reachable.

Usage:
    python run.py --k 3
    python run.py --api-base http://localhost:3017 --k 4 --out-dir outputs/manual
"""
from __future__ import annotations

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import default_api_base
from fetch import FetchError, fetch_products
from validation import normalize_rows
from clustering import TrainingBlocked, fit
from report import write_report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-base", default=default_api_base(), help="Base URL of the Express API (default: read PORT from ../.env)")
    parser.add_argument("--k", type=int, default=3, help="Number of clusters")
    parser.add_argument("--out-dir", default=None, help="Output directory (default: K-Means/outputs/<run_id>)")
    args = parser.parse_args()

    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    out_dir = Path(args.out_dir) if args.out_dir else ROOT / "outputs" / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Fetching products from {args.api_base}/api/products ...")
    try:
        raw_rows = fetch_products(args.api_base)
    except FetchError as exc:
        print(f"FETCH_ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)

    accepted, rejected = normalize_rows(raw_rows)
    print(f"Fetched {len(raw_rows)} rows -> {len(accepted)} accepted, {len(rejected)} rejected")
    if rejected:
        for item in rejected:
            print(f"  rejected row {item['row_index']}: {item['reason']}", file=sys.stderr)

    (out_dir / "raw.json").write_text(json.dumps(raw_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "rejected.json").write_text(json.dumps(rejected, ensure_ascii=False, indent=2), encoding="utf-8")

    try:
        result = fit(accepted, selected_k=args.k, run_id=run_id)
    except TrainingBlocked as exc:
        print(f"TRAINING_BLOCKED: {exc}", file=sys.stderr)
        raise SystemExit(2)

    (out_dir / "clustering.result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    paths = write_report(result, out_dir)

    print(json.dumps({
        "matrix_shape": result["matrix_shape"],
        "selected": result["selected"],
        "out_dir": str(out_dir),
        "report": paths["report"],
    }, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
