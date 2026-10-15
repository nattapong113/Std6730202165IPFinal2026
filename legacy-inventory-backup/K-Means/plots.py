"""Export the price/stock scatter and k-diagnostics charts for one run."""
from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt

COLORS = ["#1f77b4", "#d62728", "#2ca02c", "#9467bd", "#ff7f0e", "#17becf"]


def make_plots(result: dict, out_dir: str | Path) -> list[str]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    products = result["products"]

    fig, ax = plt.subplots(figsize=(9, 5.5), dpi=160)
    for cluster in sorted({p["cluster"] for p in products}):
        rows = [p for p in products if p["cluster"] == cluster]
        ax.scatter(
            [p["price"] for p in rows], [p["stock"] for p in rows],
            c=COLORS[cluster % len(COLORS)], s=75, label=f"cluster {cluster}",
            edgecolors="white", linewidths=0.6,
        )
    for center in result["centroids_original_units"]:
        ax.scatter(center["price"], center["stock"], marker="X", s=170, c=COLORS[center["cluster"] % len(COLORS)], edgecolors="black", linewidths=1.1)
        ax.annotate(f"C{center['cluster']}", (center["price"], center["stock"]), xytext=(7, 7), textcoords="offset points", fontsize=10, weight="bold")
    ax.set_title("K-means clusters on product price and stock")
    ax.set_xlabel("Price")
    ax.set_ylabel("Stock (units)")
    ax.grid(alpha=0.2)
    ax.legend(fontsize=8, loc="best")
    fig.tight_layout()
    scatter = out / "price-stock-clusters.png"
    fig.savefig(scatter)
    plt.close(fig)

    ks = [d["k"] for d in result["diagnostics"]]
    fig, (ax1, ax2) = plt.subplots(2, 1, sharex=True, figsize=(9, 6.0), dpi=160)
    ax1.plot(ks, [d["inertia"] for d in result["diagnostics"]], marker="o", color="#1f4e79", label="Inertia")
    ax1.set_ylabel("Inertia")
    ax1.grid(alpha=0.2)
    ax1.legend(loc="best")
    valid = [(d["k"], d["silhouette"]) for d in result["diagnostics"] if d["silhouette"] is not None]
    if valid:
        ax2.plot([x[0] for x in valid], [x[1] for x in valid], marker="s", color="#d62728", label="Silhouette")
        ax2.legend(loc="best")
    ax2.set_xlabel("k")
    ax2.set_ylabel("Silhouette\n(k=1 undefined)")
    ax2.set_xticks(ks)
    ax2.grid(alpha=0.2)
    fig.suptitle("Candidate k diagnostics on the same run")
    fig.tight_layout()
    diag = out / "k-diagnostics.png"
    fig.savefig(diag)
    plt.close(fig)
    return [str(scatter), str(diag)]
