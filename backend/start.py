"""Start script that reads PORT from environment (Railway sets it; no shell expansion)."""
import os
import uvicorn

port = int(os.environ.get("PORT", "8080"))
uvicorn.run("app.main:app", host="0.0.0.0", port=port)
