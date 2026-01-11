"""Test settings located inside the `PrimeBank` package.

This module imports the real project settings and overrides DATABASES to
use an in-memory SQLite database for fast, isolated unit tests.
"""
from .settings import *  # noqa: F401,F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
