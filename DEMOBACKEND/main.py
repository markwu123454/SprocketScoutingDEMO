from fastapi import FastAPI, HTTPException, Header, Depends
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
assignment_db: Dict[str, Dict[int, Dict[str, Any]]] = {}
sessions: Dict[str, datetime] = {}  # session_id -> expiration
event_info: Dict[str, Any] = {}  # currently active event

# --- Admin Auth ---
class AdminCode(BaseModel):
    code: str

@app.post("/admin/auth")
def admin_auth(body: AdminCode):
    totp = pyotp.TOTP(TOTP_SECRET)
    if not totp.verify(body.code):
        raise HTTPException(status_code=401, detail="Invalid code")

    session_id = str(uuid.uuid4())
    sessions[session_id] = datetime.now(timezone.utc) + SESSION_DURATION
    return {"session_id": session_id, "expires": sessions[session_id].isoformat()}

def verify_admin_session(x_session_id: str = Header(...)):
    now = datetime.now(timezone.utc)
    if x_session_id not in sessions or sessions[x_session_id] < now:
        raise HTTPException(status_code=403, detail="Session expired or invalid")

# --- Data Models ---
class PatchData(BaseModel):
    updates: Dict[str, Any]
    phase: Optional[str] = None

class FullData(BaseModel):
    match: str
    alliance: str
    teamNumber: int
    scouter: str
    auto: Dict[str, Any]
    teleop: Optional[Dict[str, Any]] = None
    endgame: Optional[Dict[str, Any]] = None
    postmatch: Optional[Dict[str, Any]] = None

class EventKey(BaseModel):
    event_key: str

# --- Routes ---
@app.patch("/scouting/{match}/{team}")
def patch_data(match: str, team: int, patch: PatchData):
    if match not in scouting_db:
        scouting_db[match] = {}
    if team not in scouting_db[match]:
        scouting_db[match][team] = {
            "data": {},
            "completed": False,
            "lastModified": datetime.now(timezone.utc).isoformat()
        }

    for key, value in patch.updates.items():
        parts = key.split('.')
        target = scouting_db[match][team]["data"]
        for part in parts[:-1]:
            target = target.setdefault(part, {})
        target[parts[-1]] = value

    scouting_db[match][team]["lastModified"] = datetime.now(timezone.utc).isoformat()

    if match in assignment_db and team in assignment_db[match] and patch.phase:
        assignment_db[match][team]["status"] = patch.phase

    return {"status": "patched"}

@app.post("/scouting/{match}/{team}/submit")
def submit_data(match: str, team: int, full_data: FullData):
    if match not in scouting_db:
        scouting_db[match] = {}
    scouting_db[match][team] = {
        "data": full_data.model_dump(),
        "completed": True,
        "lastModified": datetime.now(timezone.utc).isoformat()
    }
    if match in assignment_db and team in assignment_db[match]:
        assignment_db[match][team]["status"] = "submitted"
    return {"status": "submitted"}

@app.get("/assignment/{match}")
def get_assignment(match: str):
    return assignment_db.get(match, {})

@app.get("/match/{match}/{alliance}")
def get_match_info(match: str, alliance: str):
    import base64

    red_teams_1 = [7157, 4141, 3473]
    blue_teams_1 = [254, 1678, 118]
    red_teams_2 = [1690, 4414, 2073]
    blue_teams_2 = [1323, 2910, 4272]

    if match == "1":
        red_teams, blue_teams = red_teams_1, blue_teams_1
    elif match == "2":
        red_teams, blue_teams = red_teams_2, blue_teams_2
    else:
        red_teams, blue_teams = red_teams_1, blue_teams_1

    selected = red_teams if alliance == "red" else blue_teams

    team_infos = []
    for t in selected:
        logo_data = tba_fetcher.resolve_team_logo(t)
        if isinstance(logo_data, str) and logo_data.startswith("data:image"):
            logo = logo_data  # Already base64
        elif isinstance(logo_data, bytes):
            logo = f"data:image/png;base64,{base64.b64encode(logo_data).decode()}"
        else:
            logo = None
        team_infos.append({
            "number": t,
            "name": f"Team {t}",
            "logo": logo
        })

    return {
        "match": match,
        "alliance": alliance,
        "teams": [
            {
                "number": t,
                "name": f"Team {t}",
                "logo": tba_fetcher.resolve_team_logo(t)
            } for t in selected
        ]
    }

@app.get("/teams/{team}")
def get_team_info(team: int):
    return {
        "number": team,
        "name": f"Team {team}",
        "iconUrl": f"/assets/teams/{team}.png"
    }

@app.get("/status/{match}/{team}")
def get_status(match: str, team: int):
    exists = match in scouting_db and team in scouting_db[match]
    assignment = assignment_db.get(match, {}).get(team, {"scouter": None, "status": "unclaimed"})
    if not exists:
        return {
            "exists": False,
            "completed": False,
            "scouter": assignment["scouter"],
            "status": assignment["status"]
        }
    entry = scouting_db[match][team]
    return {
        "exists": True,
        "completed": entry["completed"],
        "lastModified": entry["lastModified"],
        "scouter": assignment["scouter"],
        "status": assignment["status"]
    }

@app.post("/admin/set_event")
def set_event(event: EventKey, _: Any = Depends(verify_admin_session)):
    global event_info
    try:
        event_info = tba_fetcher.get_event_data(event.event_key)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch event data: {str(e)}")
    return {"status": "event set", "event": event_info.get("name", event.event_key)}
