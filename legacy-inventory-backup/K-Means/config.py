"""Configuration for the K-means product clustering tool.

The mobile app itself talks to the deployed API over the public internet,
not localhost (see ../src/context/AuthContext.tsx, API_BASE_URL) - the
node server's DB only accepts connections from its own host, so this tool
targets the same public address by default. Override with --api-base if
you run node server.js on your own machine with a reachable database.
"""
from __future__ import annotations

DEFAULT_API_BASE = "http://119.59.102.161:3017"


def default_api_base() -> str:
    return DEFAULT_API_BASE
