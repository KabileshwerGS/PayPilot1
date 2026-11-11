"""Pytest configuration and test environment bootstrap.

Guarantees tests execute against an isolated in-memory SQLite database
without attempting remote network connections.
"""

import os

os.environ["TESTING"] = "1"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

