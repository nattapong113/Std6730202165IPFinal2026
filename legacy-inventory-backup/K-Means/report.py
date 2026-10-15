"""CSV and HTML exports for one recorded clustering run."""
from __future__ import annotations

import csv
import html
from pathlib import Path
from typing import Any

from plots import make_plots


def _fmt(value: Any, digits: int = 3) -> str:
    if value is None:
        return "undefined"
    return f"{float(value):,.{digits}f}"


def write_report(result: dict[str, Any], out_dir: str | Path) -> dict[str, str]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    products = sorted(result["products"], key=lambda p: (p["cluster"], p["name"]))

    membership_csv = out / "cluster-memberships.csv"
    with membership_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["cluster", "product_key", "name", "category", "brand", "status", "price", "stock"])
        writer.writeheader()
        for p in products:
            writer.writerow({
                "cluster": p["cluster"], "product_key": p["product_key"], "name": p["name"],
                "category": p.get("category"), "brand": p.get("brand"), "status": p.get("status"),
                "price": p["price"], "stock": p["stock"],
            })

    centroid_csv = out / "centroids.csv"
    sizes = result["selected"]["cluster_sizes"]
    with centroid_csv.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["cluster", "price", "stock", "member_count"])
        writer.writeheader()
        for c in result["centroids_original_units"]:
            writer.writerow({**c, "member_count": sizes[str(c["cluster"])]})

    scatter_path, diag_path = make_plots(result, out)
    scatter_name = Path(scatter_path).name
    diag_name = Path(diag_path).name

    product_rows = "".join(
        f"<tr><td>C{p['cluster']}</td><td><code>{html.escape(str(p['product_key']))}</code></td>"
        f"<td>{html.escape(p['name'])}</td><td>{html.escape(p.get('category') or '')}</td>"
        f"<td>{p['price']:,.2f}</td><td>{p['stock']}</td></tr>"
        for p in products
    )
    centroid_rows = "".join(
        f"<tr><td>C{c['cluster']}</td><td>{sizes[str(c['cluster'])]}</td><td>{c['price']:,.2f}</td><td>{c['stock']:,.2f}</td></tr>"
        for c in result["centroids_original_units"]
    )
    diagnostic_rows = "".join(
        f"<tr class=\"{'selected' if d['k'] == result['selected']['k'] else ''}\"><td>{d['k']}</td>"
        f"<td>{d['inertia']:.4f}</td><td>{_fmt(d['silhouette'])}</td><td>{d['realized_clusters']}</td></tr>"
        for d in result["diagnostics"]
    )

    report = out / "report.html"
    report.write_text(f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>K-means report - {html.escape(str(result.get('run_id')))}</title>
<style>
body{{font:16px Arial,sans-serif;margin:0;background:#f5f7fa;color:#1f2937}}main{{max-width:1100px;margin:auto;padding:28px}}h1,h2{{color:#1f4e79}}.cards{{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}}.card{{background:white;border:1px solid #d7dde5;border-radius:8px;padding:14px}}.value{{font-size:28px;font-weight:bold;color:#1f4e79}}section{{background:white;border:1px solid #d7dde5;border-radius:8px;padding:18px;margin:18px 0}}table{{border-collapse:collapse;width:100%;font-size:14px}}th,td{{padding:8px;border-bottom:1px solid #e5e7eb;text-align:left}}th{{background:#1f4e79;color:white}}tr.selected{{background:#fff2cc;font-weight:bold}}img{{max-width:100%;height:auto;border:1px solid #d7dde5}}code{{font-family:monospace}}@media(max-width:800px){{.cards{{grid-template-columns:1fr 1fr}}}}
</style></head><body><main>
<h1>Inventory K-means: price + stock</h1>
<div class="cards"><div class="card"><div>Matrix</div><div class="value">{result['matrix_shape'][0]} x {result['matrix_shape'][1]}</div></div><div class="card"><div>Selected k</div><div class="value">{result['selected']['k']}</div></div><div class="card"><div>Inertia</div><div class="value">{result['selected']['inertia']:.3f}</div></div><div class="card"><div>Silhouette</div><div class="value">{_fmt(result['selected']['silhouette'])}</div></div></div>
<section><h2>1. Products and learned cluster membership</h2><table><thead><tr><th>Cluster</th><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead><tbody>{product_rows}</tbody></table></section>
<section><h2>2. Price/stock scatter and centroids</h2><img src="{html.escape(scatter_name)}" alt="K-means price and stock scatter"></section>
<section><h2>3. Centroids in original units</h2><table><thead><tr><th>Cluster</th><th>Members</th><th>Mean price</th><th>Mean stock</th></tr></thead><tbody>{centroid_rows}</tbody></table></section>
<section><h2>4. Candidate k diagnostics</h2><img src="{html.escape(diag_name)}" alt="Inertia and silhouette by k"><table><thead><tr><th>k</th><th>Inertia</th><th>Silhouette</th><th>Realized clusters</th></tr></thead><tbody>{diagnostic_rows}</tbody></table></section>
</main></body></html>""", encoding="utf-8")
    return {
        "report": str(report),
        "memberships_csv": str(membership_csv),
        "centroids_csv": str(centroid_csv),
        "scatter_png": scatter_path,
        "diagnostics_png": diag_path,
    }
