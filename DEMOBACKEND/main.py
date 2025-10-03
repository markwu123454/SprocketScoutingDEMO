import os
import socket
from datetime import timedelta
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any

from fastapi import FastAPI
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

import db
import helpers
import endpoints

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")

    load_dotenv()

    app.state.DB_USER = os.getenv("DB_USER")
    app.state.DB_PASSWORD = os.getenv("DB_PASSWORD")
    app.state.DB_DATA_NAME = os.getenv("DB_DATA_NAME")
    app.state.DB_SESSION_NAME = os.getenv("DB_SESSION_NAME")
    app.state.DB_HOST = os.getenv("DB_HOST")
    app.state.DB_PORT = os.getenv("DB_PORT", 5432)

    # Initialize the databases
    await db.init_data_db()
    await db.init_session_db()

    # Load Team Data
    team_data = helpers.load_team_data("team_info.csv")

    # Initialize necessary variables
    uuid_sessions: Dict[str, Dict[str, Any]] = {}

    # Store everything in app.state
    app.state.team_data = team_data
    app.state.uuid_sessions = uuid_sessions

    app.state.config = {
        "DEFAULT_YEAR": "2025",
        "SESSION_DURATION": timedelta(hours=3),
        "UUID_DURATION": timedelta(days=100),
        "POLL_TIMEOUT": 10  # seconds
    }

    # Print out the loaded configurations (optional)
    print(f"Team data loaded: {len(team_data)} teams")

    yield

    print("Shutting down...")


app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory=Path(__file__).parent), name="static")

with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
    s.connect(("8.8.8.8", 80))  # Connect to a public DNS server to get the local IP
    local_ip = s.getsockname()[0]

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(endpoints.router)



