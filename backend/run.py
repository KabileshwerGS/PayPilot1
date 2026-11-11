import os
import sys
import uvicorn

# Guarantee both the repository root and backend directory are in sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

for path in [PROJECT_ROOT, BACKEND_DIR]:
    if path not in sys.path:
        sys.path.insert(0, path)

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        app_dir=PROJECT_ROOT
    )

