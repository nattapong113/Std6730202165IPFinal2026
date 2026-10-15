"""Reproducible price/stock K-means analysis over live Inventory products."""
from __future__ import annotations

import platform
from typing import Any

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

FEATURES = ["price", "stock"]


class TrainingBlocked(RuntimeError):
    pass


def _matrix(products: list[dict[str, Any]]) -> np.ndarray:
    if not products:
        raise TrainingBlocked("no accepted products")
    missing = [p["product_key"] for p in products if any(p.get(f) is None for f in FEATURES)]
    if missing:
        raise TrainingBlocked("missing price/stock for: " + ", ".join(missing))
    matrix = np.asarray([[float(p["price"]), float(p["stock"])] for p in products], dtype=float)
    if matrix.shape[0] < 3:
        raise TrainingBlocked("at least three products are required")
    if not np.isfinite(matrix).all():
        raise TrainingBlocked("feature matrix contains non-finite values")
    return matrix


def fit(products: list[dict[str, Any]], *, selected_k: int = 3, run_id: str | None = None) -> dict[str, Any]:
    X = _matrix(products)
    unique_vectors = np.unique(X, axis=0).shape[0]
    max_k = min(6, X.shape[0] - 1, unique_vectors)
    if selected_k < 2 or selected_k > max_k:
        raise TrainingBlocked(f"selected k must be 2..{max_k}")

    scaler = StandardScaler().fit(X)
    Z = scaler.transform(X)

    model_one = KMeans(n_clusters=1, random_state=42, n_init=10).fit(Z)
    diagnostics: list[dict[str, Any]] = [
        {"k": 1, "inertia": float(model_one.inertia_), "silhouette": None, "realized_clusters": 1}
    ]
    models: dict[int, tuple[KMeans, np.ndarray]] = {}
    for k in range(2, max_k + 1):
        model = KMeans(n_clusters=k, random_state=42, n_init=10).fit(Z)
        labels = model.labels_
        realized = int(np.unique(labels).size)
        sil = float(silhouette_score(Z, labels)) if 1 < realized < len(labels) else None
        diagnostics.append({"k": k, "inertia": float(model.inertia_), "silhouette": sil, "realized_clusters": realized})
        models[k] = (model, labels)

    model, labels = models[selected_k]
    centers = scaler.inverse_transform(model.cluster_centers_)
    assignments = []
    for product, label in zip(products, labels.tolist()):
        row = dict(product)
        row["cluster"] = int(label)
        assignments.append(row)
    sizes = {str(int(label)): int((labels == label).sum()) for label in sorted(np.unique(labels))}

    return {
        "run_id": run_id,
        "features": FEATURES,
        "matrix_shape": list(X.shape),
        "parameters": {"selected_k": selected_k, "random_state": 42, "n_init": 10, "scaler": "StandardScaler"},
        "diagnostics": diagnostics,
        "selected": {
            "k": selected_k,
            "inertia": float(model.inertia_),
            "silhouette": next(d["silhouette"] for d in diagnostics if d["k"] == selected_k),
            "cluster_sizes": sizes,
        },
        "centroids_original_units": [
            {"cluster": i, "price": float(c[0]), "stock": float(c[1])} for i, c in enumerate(centers)
        ],
        "products": assignments,
        "versions": {"python": platform.python_version(), "numpy": np.__version__, "scikit_learn": __import__("sklearn").__version__},
    }
