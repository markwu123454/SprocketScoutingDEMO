import csv
from fastapi import FastAPI, HTTPException, Header, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
import os
import pyotp
import uuid
import tba_fetcher
from dotenv import load_dotenv

load_dotenv()

DEFAULT_YEAR = "2025"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or ["http://192.168.1.127:5173"] for tighter control
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment secrets
TOTP_SECRET = os.getenv("TOTP_SECRET", "base32secret3232")
SESSION_DURATION = timedelta(minutes=30)

# In-memory storages
scouting_db: Dict[str, Dict[int, Dict[str, Any]]] = {}
sessions: Dict[str, datetime] = {}  # session_id -> expiration

team_data = {}
with open("team_info.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        number = int(row["team_number"])
        nickname = row["nickname"]
        team_data[number] = nickname


# --- Data Models ---
class PatchData(BaseModel):
    updates: Dict[str, Any]
    phase: Optional[str] = None


class FullData(BaseModel):
    match: str
    alliance: str
    teamNumber: int
    scouter: str
    auto: Optional[Dict[str, Any]] = None
    teleop: Optional[Dict[str, Any]] = None
    endgame: Optional[Dict[str, Any]] = None
    postmatch: Optional[Dict[str, Any]] = None


class EventKey(BaseModel):
    event_key: str


class AdminCode(BaseModel):
    code: str

# --- Admin Auth ---

@app.post("/admin/auth")
def admin_auth(body: AdminCode):
    """
    Authenticates an admin using TOTP.
    Returns a session ID valid for 30 minutes.
    """
    totp = pyotp.TOTP(TOTP_SECRET)
    if not totp.verify(body.code):
        raise HTTPException(status_code=401, detail="Invalid code")

    session_id = str(uuid.uuid4())
    sessions[session_id] = datetime.now(timezone.utc) + SESSION_DURATION
    return {"session_id": session_id, "expires": sessions[session_id].isoformat()}


def verify_admin_session(x_session_id: str = Header(...)):
    """
    Dependency: Verifies that a given admin session ID is valid and not expired.
    Raises 403 if invalid.
    """
    now = datetime.now(timezone.utc)
    if x_session_id not in sessions or sessions[x_session_id] < now:
        raise HTTPException(status_code=403, detail="Session expired or invalid")


# --- Routes ---

@app.patch("/scouting/{match}/{team}")
def patch_data(match: str, team: int, patch: PatchData):
    """
    Patch (partially update) a team's scouting data for a specific match.
    Supports nested keys (e.g., 'auto.score').
    Updates phase status if provided.
    """
    if match not in scouting_db:
        scouting_db[match] = {}
    if team not in scouting_db[match]:
        scouting_db[match][team] = {
            "data": {},
            "alliance": None,
            "scouter": None,
            "status": "unclaimed",
            "lastModified": datetime.now(timezone.utc).isoformat()
        }

    unclaimed = False
    for key, value in patch.updates.items():
        parts = key.split('.')
        target = scouting_db[match][team]["data"]

        if key == "scouter":
            if value == "__UNCLAIM__":
                unclaimed = True
            else:
                scouting_db[match][team]["scouter"] = value
            continue  # skip storing into .data

        for part in parts[:-1]:
            target = target.setdefault(part, {})
        target[parts[-1]] = value

    if patch.phase:
        scouting_db[match][team]["status"] = patch.phase

    if unclaimed:
        scouting_db[match][team]["scouter"] = None
        scouting_db[match][team]["status"] = "unclaimed"

    scouting_db[match][team]["lastModified"] = datetime.now(timezone.utc).isoformat()
    return {"status": "patched"}


@app.post("/scouting/{match}/{team}/submit")
def submit_data(match: str, team: int, full_data: FullData):
    """
    Submit full scouting data for a team in a specific match.
    Replaces any previous data for that match/team.
    Sets status to 'submitted'.
    """
    if match not in scouting_db:
        scouting_db[match] = {}
    scouting_db[match][team] = {
        "data": full_data.model_dump(),
        "alliance": full_data.alliance,
        "scouter": full_data.scouter,
        "status": "submitted",
        "lastModified": datetime.now(timezone.utc).isoformat()
    }
    return {"status": "submitted"}


@app.get("/match/{match}/{alliance}")
def get_match_info(match: str, alliance: str):
    """
    Get team numbers, names, and logos for a given match and alliance ('red' or 'blue').
    Also returns current scouter assignments (if any).
    """
    event_key = "2025caoc"  # hardcoded or pull from config if needed

    try:
        team_numbers = tba_fetcher.get_match_alliance_teams(event_key, int(match), alliance)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "match": match,
        "alliance": alliance,
        "teams": [
            {
                "number": int(t),
                "name": tba_fetcher.fetch_team_name_cached(f"frc{t}"),
                "logo": tba_fetcher.resolve_team_logo_cached(int(t)),
                "scouter": (
                    scouting_db.get(match, {}).get(int(t), {}).get("scouter")
                ),
            }
            for t in team_numbers
        ],
    }


@app.get("/teams/{team}")
def get_team_info(team: int):
    """
    Returns basic info (number, nickname, logo URL) for a given team.
    Uses preloaded CSV data.
    """
    if team not in team_data:
        raise HTTPException(status_code=404, detail="Team not found")
    return {
        "number": team,
        "name": team_data[team],
        "iconUrl": f"/assets/teams/{team}.png"
    }


@app.get("/status/{match}/{team}")
def get_status(match: str, team: str):  # team is str to allow "None"
    """
    Returns scouting status and scouter assignment for a specific team in a match.
    If match/team are both "All", returns full status for the event.
    """
    if match == "All" and team == "All":
        full_status = {}
        for m, teams in scouting_db.items():
            full_status[m] = {}
            for t, data in teams.items():
                full_status[m][t] = {
                    "status": data.get("status", "prematch"),
                    "scouter": data.get("scouter")
                }
        return full_status

    # Convert team to int if not None
    try:
        team_int = int(team)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid team number")

    exists = match in scouting_db and team_int in scouting_db[match]
    if not exists:
        return {
            "exists": False,
            "scouter": None,
            "status": "unclaimed"
        }

    entry = scouting_db[match][team_int]
    return {
        "exists": True,
        "lastModified": entry["lastModified"],
        "scouter": entry.get("scouter"),
        "status": entry.get("status", "error")
    }


@app.post("/admin/set_event")
def set_event(event: EventKey, _: Any = Depends(verify_admin_session)):
    """
    Admin-only: Initializes the scouting database for a given event key.
    Pulls data from TBA and creates empty records for each team in each match.
    """
    global scouting_db
    try:
        matches = tba_fetcher.get_event_data(event.event_key)["matches"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch event data: {str(e)}")

    scouting_db.clear()
    for match in matches:
        match_key = match["key"].split("_")[-1]  # e.g., qm1
        scouting_db[match_key] = {}
        for side in ["red", "blue"]:
            for team_key in match["alliances"][side]["team_keys"]:
                team_number = int(team_key[3:])
                scouting_db[match_key][team_number] = {
                    "data": {},
                    "alliance": side,
                    "scouter": None,
                    "status": "unclaimed",
                    "lastModified": None
                }
    return {"status": "event initialized", "matches": len(matches)}


# --- WebSocket Endpoint ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Basic WebSocket that accepts connections and echoes back any received message.
    Useful for testing or simple live communication.
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        print("Client disconnected")