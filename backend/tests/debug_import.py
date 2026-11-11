import sys
import os
sys.path.insert(0, os.path.abspath("."))
print("1. Python starting, sys.path[0]:", sys.path[0], flush=True)

from backend.app.main import app
print("2. app imported", flush=True)

from fastapi.testclient import TestClient
print("3. TestClient imported", flush=True)

client = TestClient(app)
print("4. TestClient instance created", flush=True)

r = client.get("/api/health")
print("5. Health response:", r.status_code, r.json(), flush=True)
