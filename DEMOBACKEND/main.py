import asyncio
import csv

from fastapi import FastAPI, Header, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
from functools import partial
import os
import uuid
import tba_fetcher
from dotenv import load_dotenv

# <editor-fold desc="Setup">
load_dotenv()

DEFAULT_YEAR = "2025"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.1.22:5173", "http://10.176.209.233:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment secrets
TOTP_SECRET = os.getenv("TOTP_SECRET", "base32secret3232")
SESSION_DURATION = timedelta(minutes=30)

# In-memory storages
scouting_db: Dict[str, Dict[int, Dict[str, Any]]] = {}
uuid_sessions: Dict[str, Dict[str, Any]] = {}
UUID_DURATION = timedelta(days=100)

team_data = {}
with open("team_info.csv", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        number = int(row["team_number"])
        nickname = row["nickname"]
        team_data[number] = nickname

POLL_TIMEOUT = 10  # seconds

# </editor-fold>

# <editor-fold desc="Data Models">

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


class PasscodeBody(BaseModel):
    passcode: str


# </editor-fold>

# <editor-fold desc="Auth">
@app.post("/auth/login")
def login(body: PasscodeBody):
    """
    Authenticates via passcode and returns UUID session and permissions.
    """
    try:
        with open("users.csv", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row["passcode"] == body.passcode:
                    session_id = str(uuid.uuid4())
                    uuid_sessions[session_id] = {
                        "name": row["name"],
                        "dev": row["dev"].lower() == "true",
                        "admin": row["admin"].lower() == "true",
                        "match_scouting": row["match_scouting"].lower() == "true",
                        "pit_scouting": row["pit_scouting"].lower() == "true",
                        "expires": datetime.now(timezone.utc) + UUID_DURATION
                    }
                    return {
                        "uuid": session_id,
                        "name": row["name"],
                        "expires": uuid_sessions[session_id]["expires"].isoformat(),
                        "permissions": {
                            "dev": uuid_sessions[session_id]["dev"],
                            "admin": uuid_sessions[session_id]["admin"],
                            "match_scouting": uuid_sessions[session_id]["match_scouting"],
                            "pit_scouting": uuid_sessions[session_id]["pit_scouting"],
                        }
                    }
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="User file not found")

    raise HTTPException(status_code=401, detail="Invalid passcode")


@app.get("/auth/verify")
def verify_session(x_uuid: str = Header(...)):
    session = uuid_sessions.get(x_uuid)
    if not session or session["expires"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="Invalid or expired UUID")
    return {
        "name": session["name"],
        "permissions": {
            "dev": session["dev"],
            "admin": session["admin"],
            "match_scouting": session["match_scouting"],
            "pit_scouting": session["pit_scouting"],
        },
    }


def verify_uuid(
        x_uuid: str = Header(..., alias="x-uuid"),
        required: Optional[str] = None
) -> Dict[str, Any]:
    """
    Verifies UUID session and required permission.
    """
    session = uuid_sessions.get(x_uuid)
    if not session or session["expires"] < datetime.now(timezone.utc):
        raise HTTPException(status_code=403, detail="Invalid or expired UUID")

    if required and not session.get(required, False):
        raise HTTPException(status_code=403, detail=f"Missing '{required}' permission")

    return session  # can be used in route handler


# </editor-fold>

# <editor-fold desc="Admin">
@app.post("/admin/expire/{session_id}")
def expire_uuid(session_id: str, _: dict = Depends(partial(verify_uuid, required="admin"))):
    """
    Expires a single UUID session.
    """
    if session_id in uuid_sessions:
        del uuid_sessions[session_id]
        return {"status": "expired"}
    raise HTTPException(status_code=404, detail="Session ID not found")


@app.post("/admin/expire_all")
def expire_all(_: dict = Depends(partial(verify_uuid, required="admin"))):
    """
    Expires all UUID sessions.
    """
    uuid_sessions.clear()
    return {"status": "all expired"}


@app.post("/admin/set_event")
def set_event(event: EventKey, _: dict = Depends(partial(verify_uuid, required="admin"))):
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


# </editor-fold>

# <editor-fold desc="HTTP non-polling">
from fastapi import HTTPException

@app.patch("/scouting/{match}/{team}")
def patch_metadata_only(match: str, team: int, patch: PatchData,
                        _: dict = Depends(partial(verify_uuid, required="match_scouting"))):
    """
    Patch only metadata: scouter and phase (status).
    Rejects all other update keys.
    """
    if match not in scouting_db:
        scouting_db[match] = {}
    if team not in scouting_db[match]:
        scouting_db[match][team] = {
            "data": {},
            "alliance": None,
            "scouter": None,
            "status": "unclaimed",
            "lastModified": None,
        }

    entry = scouting_db[match][team]
    updated = False

    for key, value in patch.updates.items():
        if key == "scouter":
            new_value = None if value == "__UNCLAIM__" else value
            if entry["scouter"] != new_value:
                entry["scouter"] = new_value
                updated = True
            if value == "__UNCLAIM__":
                if entry["status"] != "unclaimed":
                    entry["status"] = "unclaimed"
                    updated = True
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported patch key: {key}")

    if patch.phase and patch.phase != entry["status"]:
        entry["status"] = patch.phase
        updated = True

    if updated:
            entry["lastModified"] = datetime.now(timezone.utc).isoformat()

    return {"status": "patched"}



@app.post("/scouting/{match}/{team}/submit")
def submit_data(match: str, team: int, full_data: FullData,
                _: dict = Depends(partial(verify_uuid, required="match_scouting"))):
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
def get_match_info(match: str, alliance: str, _: dict = Depends(partial(verify_uuid, required="match_scouting"))):
    """
    Get team numbers, names, and logos for a given match and alliance ('red' or 'blue').
    Also initializes empty scouting_db entries if they don't exist.
    """
    event_key = "2025caoc"  # hardcoded or pull from config if needed

    try:
        team_numbers = tba_fetcher.get_match_alliance_teams(event_key, int(match), alliance)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    if match not in scouting_db:
        scouting_db[match] = {}

    for t in team_numbers:
        t_int = int(t)
        if t_int not in scouting_db[match]:
            scouting_db[match][t_int] = {
                "data": {},
                "alliance": alliance,
                "scouter": None,
                "status": "unclaimed",
                "lastModified": None,
            }

    return {
        "match": match,
        "alliance": alliance,
        "teams": [
            {
                "number": int(t),
                "name": tba_fetcher.fetch_team_name_cached(f"frc{t}"),
                "logo": tba_fetcher.resolve_team_logo_cached(int(t)),
                "scouter": scouting_db[match][int(t)]["scouter"],
            }
            for t in team_numbers
        ],
    }


@app.get("/teams/{team}")
def get_team_info(team: int, _: dict = Depends(partial(verify_uuid, required="match_scouting"))):
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
def get_status(match: str, team: str,
               _: dict = Depends(partial(verify_uuid, required="match_scouting"))):  # team is str to allow "None"
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


# </editor-fold>

# <editor-fold desc="HTTP polling">

@app.get("/poll/match/{match}/{alliance}")
async def poll_scouter_changes(match: str, alliance: str,
                               client_ts: str = "",
                               _: dict = Depends(partial(verify_uuid, required="match_scouting"))):
    """
    Poll for scouter assignment changes using lastModified timestamps.
    Returns when any of the 3 team slots have changed since client_ts.
    """
    timeout_s = 10
    check_interval = 0.1  # seconds

    def parse_ts(ts: str) -> datetime:
        try:
            return datetime.fromisoformat(ts)
        except Exception:
            return datetime.min.replace(tzinfo=timezone.utc)

    client_time = parse_ts(client_ts)

    async def get_current_state():
        if match not in scouting_db:
            return {}, None

        team_data = {
            str(team): {
                "scouter": data.get("scouter")
            }
            for team, data in scouting_db[match].items()
            if data.get("alliance") == alliance
        }

        timestamps = [
            datetime.fromisoformat(scouting_db[match][team]["lastModified"])
            for team in scouting_db[match]
            if scouting_db[match][team].get("alliance") == alliance
            and scouting_db[match][team].get("lastModified")
        ]
        max_ts = max(timestamps, default=datetime.min.replace(tzinfo=timezone.utc))
        return team_data, max_ts

    start = asyncio.get_event_loop().time()
    while True:
        current_state, max_ts = await get_current_state()
        if max_ts and max_ts > client_time:
            # Wait briefly to catch possible back-to-back updates
            await asyncio.sleep(0.3)
            current_state, max_ts = await get_current_state()
            return {
                "timestamp": max_ts.isoformat(),
                "teams": current_state
            }

        if asyncio.get_event_loop().time() - start > timeout_s:
            return {
                "timestamp": max_ts.isoformat() if max_ts else None,
                "teams": current_state
            }

        await asyncio.sleep(check_interval)

# </editor-fold>
