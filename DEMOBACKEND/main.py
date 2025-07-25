import asyncio
import csv
import json
import sqlite3
import time
from fastapi import FastAPI, Header, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Dict, Any, Optional, Literal, cast
from datetime import datetime, timedelta, timezone
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from functools import partial
import os
import uuid
import tba_fetcher
from dotenv import load_dotenv

# <editor-fold desc="Setup">
load_dotenv()

DEFAULT_YEAR = "2025"


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting up...")
    yield
    print("Shutting down...")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.1.22:5173", "http://10.176.209.233:5173", "http://192.168.1.194:5173",
                   "http://192.168.1.106:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment secrets
TOTP_SECRET = os.getenv("TOTP_SECRET", "base32secret3232")
SESSION_DURATION = timedelta(minutes=30)

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

# <editor-fold desc="DataBase">
def get_db_conn():
    return sqlite3.connect("match_scouting.db", check_same_thread=False)


alliance_type = Literal["red", "blue"]
match_type = Literal["qm", "sf", "f"]
status_type = Literal["unclaimed", "pre", "auto", "teleop", "post", "submitted"]

match_scouting_conn = get_db_conn()
match_scouting_cursor = match_scouting_conn.cursor()
match_scouting_cursor.execute("""
                              CREATE TABLE IF NOT EXISTS match_scouting
                              (
                                  match
                                  INTEGER,
                                  match_type
                                  TEXT,
                                  team
                                  TEXT,
                                  alliance
                                  TEXT,
                                  scouter
                                  TEXT,
                                  status
                                  TEXT,
                                  data
                                  TEXT,
                                  last_modified
                                  INTEGER
                              )
                              """)
match_scouting_conn.commit()


def add_match_scouting(
        match: int,
        m_type: match_type,
        team: int | str,
        alliance: alliance_type,
        scouter: str | None,
        status: status_type,
        data: Dict[str, Any]
):
    conn = get_db_conn()
    cursor = conn.cursor()
    cursor.execute("""
                   INSERT INTO match_scouting
                   (match, match_type, team, alliance, scouter, status, data, last_modified)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   """, (
                       match,
                       m_type,
                       str(team),
                       alliance,
                       scouter,
                       status,
                       json.dumps(data),
                       time.time_ns()
                   ))
    conn.commit()


def update_match_scouting(
        match: int,
        m_type: match_type,
        team: int | str,
        scouter: str,
        status: Optional[status_type] = None,
        data: Optional[Dict[str, Any]] = None
):
    conn = get_db_conn()
    cursor = conn.cursor()
    # Fetch existing record
    cursor.execute("""
                   SELECT data, status
                   FROM match_scouting
                   WHERE match = ? AND match_type = ? AND team = ? AND scouter = ?
                   """, (match, m_type, str(team), scouter))
    row = cursor.fetchone()
    if not row:
        raise ValueError("Match scouting entry not found")

    current_data = json.loads(row[0])
    current_status = row[1]

    # Merge delta
    if data:
        current_data.update(data)

    new_status = status if status is not None else current_status

    cursor.execute("""
                   UPDATE match_scouting
                   SET data          = ?,
                       status        = ?,
                       last_modified = ?
                   WHERE match = ? AND match_type = ? AND team = ? AND scouter = ?
                   """, (
                       json.dumps(current_data),
                       new_status,
                       time.time_ns(),
                       match,
                       m_type,
                       str(team),
                       scouter
                   ))
    conn.commit()


def get_match_scouting(
        match: Optional[int] = None,
        m_type: Optional[match_type] = None,
        team: Optional[int | str] = None,
        scouter: Optional[str] = "__NOTPASSED__"
) -> list[dict]:
    conn = get_db_conn()
    cursor = conn.cursor()
    query = "SELECT * FROM match_scouting WHERE 1=1"
    params = []

    if match is not None:
        query += " AND match = ?"
        params.append(match)
    if m_type is not None:
        query += " AND match_type = ?"
        params.append(m_type)
    if team is not None:
        query += " AND team = ?"
        params.append(str(team))

    if scouter != "__NOTPASSED__":
        if scouter is None:
            query += " AND scouter IS NULL"
        else:
            query += " AND scouter = ?"
            params.append(scouter)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "match": r[0],
            "match_type": r[1],
            "team": r[2],
            "alliance": r[3],
            "scouter": r[4],
            "status": r[5],
            "data": json.loads(r[6]),
            "last_modified": r[7]
        }
        for r in rows
    ]


# </editor-fold>

# <editor-fold desc="Data Models">

class FullData(BaseModel):
    alliance: alliance_type
    scouter: str
    match_type: match_type
    auto: Optional[Dict[str, Any]] = None
    teleop: Optional[Dict[str, Any]] = None
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


def get_scouter_from_uuid(uuid: str) -> Optional[str]:
    session = uuid_sessions.get(uuid)
    return session.get("scouter") if session else None


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

@app.patch("/scouting/{m_type}/{match}/{team}/state")
def update_state(
        match: int,
        team: int,
        scouter: str,
        status: str,
        m_type: match_type,
        _: dict = Depends(partial(verify_uuid, required="match_scouting"))
):
    existing = get_match_scouting(match=match, m_type=m_type, team=team)
    if not existing:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry = existing[0]

    if scouter == "__UNCLAIM__":
        # ── Unclaim flow ──────────────────────────────────────────────
        if entry["status"] != "unclaimed":
            update_match_scouting(
                match=entry["match"],
                m_type=entry["match_type"],
                team=entry["team"],
                scouter=entry["scouter"],  # still present
                data=None,
                status="unclaimed"
            )

        # Now clear scouter
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
                       UPDATE match_scouting
                       SET scouter       = NULL,
                           last_modified = ?
                       WHERE match = ? AND match_type = ? AND team = ? AND scouter IS ?
                       """, (
                           time.time_ns(),
                           entry["match"],
                           entry["match_type"],
                           entry["team"],
                           entry["scouter"]
                       ))
        conn.commit()
        conn.close()

        return {"status": "patched", "scouter": None, "phase": "unclaimed"}

    # ── Normal flow ───────────────────────────────────────────────────
    new_scouter = scouter
    original_scouter = entry["scouter"]

    if new_scouter != original_scouter:
        conn = get_db_conn()
        cursor = conn.cursor()
        cursor.execute("""
                       UPDATE match_scouting
                       SET scouter       = ?,
                           last_modified = ?
                       WHERE match = ? AND match_type = ? AND team = ? AND scouter IS ?
                       """, (
                           new_scouter,
                           time.time_ns(),
                           entry["match"],
                           entry["match_type"],
                           entry["team"],
                           original_scouter
                       ))
        conn.commit()
        conn.close()
        original_scouter = new_scouter

    if status != entry["status"]:
        update_match_scouting(
            match=entry["match"],
            m_type=entry["match_type"],
            team=entry["team"],
            scouter=original_scouter,
            data=None,
            status=cast(status_type, status)
        )

    return {"status": "patched", "scouter": original_scouter, "phase": status}


@app.patch("/scouting/{m_type}/{match}/{team}/{scouter}")
def update_match(
        match: int,
        team: int,
        scouter: str,
        m_type: match_type,
        data: dict = Body(...),
        _: dict = Depends(partial(verify_uuid, required="match_scouting"))
):
    update_match_scouting(
        match=match,
        m_type=m_type,
        team=team,
        scouter=scouter,
        data=data
    )

    return {"status": "patched"}


@app.post("/scouting/{match}/{team}/submit")
def submit_data(
        match: int,
        team: int,
        full_data: FullData,
        _: dict = Depends(partial(verify_uuid, required="match_scouting"))
):
    data = full_data.model_dump()
    data.pop("alliance", None)
    data.pop("scouter", None)
    data.pop("match_type", None)

    # Check if entry exists
    existing = get_match_scouting(
        match=match,
        m_type=full_data.match_type,
        team=team,
        scouter=full_data.scouter
    )

    if not existing:
        # Add it first
        add_match_scouting(
            match=match,
            m_type=full_data.match_type,
            team=team,
            alliance=full_data.alliance,
            scouter=full_data.scouter,
            status="post",  # Initial status before submit
            data={}  # Start with empty data
        )

    # Then update it with the submitted data
    update_match_scouting(
        match=match,
        m_type=full_data.match_type,
        team=team,
        scouter=full_data.scouter,
        status="submitted",
        data=data
    )

    return {"status": "submitted"}


@app.get("/scouting/current")
async def get_current_scouting(
        session: dict = Depends(partial(verify_uuid, required="match_scouting"))
) -> Optional[dict]:
    scouter = session.get("name")
    if not scouter:
        raise HTTPException(status_code=400, detail="Scouter name not found in session")

    entries = get_match_scouting(scouter=scouter)
    for e in entries:
        if e["status"] != "submitted":
            return e

    return None


@app.get("/match/{match}/{alliance}/{m_type}")
def get_match_info(
        match: int,
        alliance: alliance_type,
        m_type: match_type,
        _: dict = Depends(partial(verify_uuid, required="match_scouting"))
):
    event_key = "2025caoc"
    try:
        team_numbers = tba_fetcher.get_match_alliance_teams_cached(event_key, m_type, match, alliance)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    for t in team_numbers:
        if not get_match_scouting(match=match, m_type=m_type, team=str(t)):
            add_match_scouting(
                match=match,
                m_type=m_type,
                team=t,
                alliance=alliance,
                scouter=None,
                status="unclaimed",
                data={}
            )

    return {
        "teams": [
            {
                "number": int(t),
                "name": tba_fetcher.fetch_team_name_cached(f"frc{t}"),
                "logo": tba_fetcher.resolve_team_logo_cached(int(t)),
                "scouter": get_match_scouting(match=match, m_type=m_type, team=t)[0].get("scouter")
            }
            for t in team_numbers
        ]
    }


@app.get("/teams/{team}")
def get_team_info(
        team: int,
        _: dict = Depends(partial(verify_uuid, required="match_scouting"))
):
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
def get_status(
        match: str,
        team: str,
        _: dict = Depends(partial(verify_uuid, required="match_scouting"))
):
    if match == "All" and team == "All":
        all_entries = get_match_scouting(None, None, None, None)
        full_status = {}
        for e in all_entries:
            m = str(e["match"])
            t = int(e["team"])
            if m not in full_status:
                full_status[m] = {}
            full_status[m][t] = {
                "status": e["status"],
                "scouter": e["scouter"]
            }
        return full_status

    try:
        team_int = int(team)
        match_int = int(match)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid match or team")

    entries = get_match_scouting(match=match_int, m_type=None, team=team_int, scouter=None)
    if not entries:
        return {
            "exists": False,
            "scouter": None,
            "status": "unclaimed"
        }

    entry = entries[0]
    return {
        "exists": True,
        "lastModified": datetime.fromtimestamp(entry["last_modified"] / 1e9, tz=timezone.utc).isoformat(),
        "scouter": entry.get("scouter"),
        "status": entry.get("status", "error")
    }


@app.get("/ping")
def ping():
    return {"ping": "pong"}


# </editor-fold>

# <editor-fold desc="HTTP polling">
@app.get("/poll/match/{match}/{match_type}/{alliance}")
async def poll_scouter_changes(
        match: int,
        m_type: match_type,
        alliance: str,
        client_ts: str = "",
        _: dict = Depends(partial(verify_uuid, required="match_scouting"))):
    timeout_ns = 10 * 1_000_000_000  # 10 seconds in nanoseconds
    check_interval = 0.2  # seconds

    def parse_ts(ts: str) -> int:
        try:
            return int(ts)
        except Exception:
            return 0

    client_ns = parse_ts(client_ts)

    async def get_current_state():
        entries = get_match_scouting(match=match, m_type=m_type)
        relevant = [e for e in entries if e["alliance"] == alliance]
        latest_ns = max((e["last_modified"] for e in relevant if e["last_modified"]), default=0)
        team_data = {
            str(e["team"]): {"scouter": e.get("scouter")}
            for e in relevant
        }
        return team_data, latest_ns

    start = time.time_ns()
    while True:
        current_state, latest_ns = await get_current_state()
        if latest_ns > client_ns:
            await asyncio.sleep(0.3)
            current_state, latest_ns = await get_current_state()
            return {
                "timestamp": str(latest_ns),
                "teams": current_state
            }

        if time.time_ns() - start > timeout_ns:
            return {
                "timestamp": str(latest_ns) if latest_ns else None,
                "teams": current_state
            }

        await asyncio.sleep(check_interval)


@app.get("/poll/admin_match/{match}/{match_type}")
async def poll_admin_match_changes(
        match: int,
        match_type: str,
        client_ts: str = "",
        _: dict = Depends(partial(verify_uuid, required="admin")),
):
    timeout_ns = 10 * 1_000_000_000  # 10 seconds
    check_interval = 0.2  # seconds

    def parse_ts(ts: str) -> int:
        try:
            return int(ts)
        except Exception:
            return 0

    client_ns = parse_ts(client_ts)

    async def get_current_state():
        entries = get_match_scouting(match=match)
        relevant = [e for e in entries if e["match_type"] == match_type]
        latest_ns = max((e["last_modified"] for e in relevant if e["last_modified"]), default=0)
        return relevant, latest_ns

    start = time.time_ns()
    while True:
        current_state, latest_ns = await get_current_state()
        if latest_ns > client_ns:
            await asyncio.sleep(0.3)
            current_state, latest_ns = await get_current_state()
            return {
                "timestamp": str(latest_ns),
                "entries": current_state  # full list of match_scouting dicts
            }

        if time.time_ns() - start > timeout_ns:
            return {
                "timestamp": str(latest_ns) if latest_ns else None,
                "entries": current_state
            }

        await asyncio.sleep(check_interval)

# </editor-fold>
