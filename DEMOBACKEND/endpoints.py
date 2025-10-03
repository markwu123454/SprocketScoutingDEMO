import ast
import asyncio
import uuid
import csv
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Body, APIRouter, Request
from starlette.responses import HTMLResponse

import tba_fetcher
import db
import enums

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
def root():
    return """
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>API Status</title>
  <style>
    :root{
      --bg1:#140a2a; --bg2:#1f0b46; --card:#2a124d; --ink:#ffffff;
      --ok:#8b5cf6; /* vivid purple */
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    body{
      margin:0; color:var(--ink);
      background: radial-gradient(
                80% 110% at 10% 10%,
                #4c2c7a,
                var(--bg2)
              ) fixed,
              linear-gradient(135deg, var(--bg1), var(--bg2)) fixed;
      display:flex; align-items:center; justify-content:center;
      font:16px/1.5 system-ui,Segoe UI,Roboto,Helvetica,Arial;
    }
    .logo{
      position:fixed; top:16px; left:16px; width:168px; height:168px;
    }
    .logo img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
    .ring{ animation: spin 14s linear infinite; transform-origin: 50% 50%; }
    @keyframes spin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }

    .card{
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(139,92,246,0.35);
      border-radius: 16px;
      padding: 42px 64px;
      text-align:center;
      box-shadow: 0 12px 40px rgba(0,0,0,0.35), inset 0 0 60px rgba(139,92,246,0.08);
      backdrop-filter: blur(10px);
    }
    h1{ margin:0 0 8px; font-size:28px; letter-spacing:.3px }
    .status{
      display:inline-block; font-weight:700; font-size:14px;
      padding:8px 14px; border-radius:999px;
      background: var(--ok); color:#0b0420;
      box-shadow: 0 0 0 0 rgba(139,92,246,.6);
      animation: pulse 2.2s ease-out infinite;
    }
    @keyframes pulse{
      0%{ box-shadow:0 0 0 0 rgba(139,92,246,.55) }
      70%{ box-shadow:0 0 0 14px rgba(139,92,246,0) }
      100%{ box-shadow:0 0 0 0 rgba(139,92,246,0) }
    }
    .links{ margin-top:14px; opacity:.9 }
    .links a{
      color:#c4b5fd; text-decoration:none; margin:0 10px; font-size:14px
    }
    .links a:hover{ text-decoration:underline }
  </style>
</head>
<body>
  <div class="logo" aria-hidden="true">
    <img class="ring" src="/static/sprocket_logo_ring.png" alt="">
    <img class="gear" src="/static/sprocket_logo_gear.png" alt="">
  </div>

  <div class="card">
    <h1>Scouting Server is Online</h1>
    <div class="status">STATUS: OK</div>
    <div class="links">
      <a href="/docs">Swagger UI</a>
      <a href="/redoc">ReDoc</a>
      <a href="#" id="pingLink" onclick="sendPing(event)">Ping</a>
    </div>
    <script>
async function sendPing(event) {
    event.preventDefault();
    const link = document.getElementById("pingLink");
    link.textContent = "Pinging...";
    const start = performance.now();

    try {
        const res = await fetch("/ping");
        if (!res.ok) throw new Error("Ping failed");
        await res.text(); // consume body

        const ms = Math.round(performance.now() - start);
        link.textContent = `Pong! (${ms}ms)`;
    } catch (err) {
        link.textContent = "Ping failed";
    }
}
</script>
  </div>
</body>
</html>
    """


@router.get("/ping")
def ping():
    return {"ping": "pong"}


@router.post("/auth/login")
async def login(request: Request, body: enums.PasscodeBody):
    """
    Authenticates via passcode and returns UUID session and permissions.
    """
    try:
        with open("users.csv", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if str(row["passcode"]) == body.passcode:
                    session_id = str(uuid.uuid4())
                    expires_dt = datetime.now(timezone.utc) + request.app.state.config["UUID_DURATION"]

                    session_data = {
                        "name": row["name"],
                        "permissions": {
                            "dev": row["dev"].lower() == "true",
                            "admin": row["admin"].lower() == "true",
                            "match_scouting": row["match_scouting"].lower() == "true",
                            "pit_scouting": row["pit_scouting"].lower() == "true",
                            "match_access": []
                        },
                        "expires": expires_dt.isoformat()  # for JSON payload
                    }

                    # Store session in the database with datetime, not string
                    await db.add_session(session_id, session_data, expires_dt)

                    return {
                        "uuid": session_id,
                        "name": session_data["name"],
                        "expires": session_data["expires"],  # ISO string for response
                        "permissions": session_data["permissions"]
                    }
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="User file not found")

    raise HTTPException(status_code=401, detail="Invalid passcode")


@router.post("/auth/login/guest")
async def guest_login(request: Request, body: enums.PasscodeBody):
    """
    Authenticates via passcode and returns UUID session and permissions.
    """
    try:
        with open("users.csv", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if str(row["passcode"]) == body.passcode:
                    session_id = str(uuid.uuid4())
                    expires_dt = datetime.now(timezone.utc) + request.app.state.config["SESSION_DURATION"]

                    session_data = {
                        "name": row["name"],
                        "permissions": {
                            "dev": False,
                            "admin": False,
                            "match_scouting": False,
                            "pit_scouting": False,
                            "match_access": ast.literal_eval(row["match_access"])
                        },
                        "expires": expires_dt.isoformat()  # for JSON payload
                    }

                    # Store session in the database with datetime, not string
                    await db.add_session(session_id, session_data, expires_dt)

                    return {
                        "uuid": session_id,
                        "name": session_data["name"],
                        "expires": session_data["expires"],  # ISO string for response
                        "permissions": session_data["permissions"]
                    }
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="User file not found")

    raise HTTPException(status_code=401, detail="Invalid passcode")


@router.get("/auth/verify")
async def verify_session(session: enums.SessionInfo = Depends(db.require_session())):
    """
    Verifies the UUID session from headers (x-uuid) and returns identity + permissions.
    """
    return {
        "name": session.name,
        "permissions": {
            "dev": session.permissions.dev,
            "admin": session.permissions.admin,
            "match_scouting": session.permissions.match_scouting,
            "pit_scouting": session.permissions.pit_scouting,
        },
    }



@router.get
async def verify_session(session: enums.SessionInfo = Depends(db.require_session())):
    return {
        "name": session.name,
        "permissions": {
            "dev": session.permissions.dev,
            "admin": session.permissions.admin,
            "match_scouting": session.permissions.match_scouting,
            "pit_scouting": session.permissions.pit_scouting,
        },
    }


@router.post("/admin/expire/{session_id}")
async def expire_uuid(session_id: str, _: enums.SessionInfo = Depends(db.require_permission("admin"))):
    """
    Expires a single UUID session.
    """
    await db.delete_session(session_id)
    return {"status": "expired"}


@router.post("/admin/expire_all")
async def expire_all(_: enums.SessionInfo = Depends(db.require_permission("admin"))):
    """
    Expires all UUID sessions.
    """
    await db.delete_all_sessions()
    return {"status": "all expired"}


@router.post("/admin/set_event")
async def set_event(event: str, _: enums.SessionInfo = Depends(db.require_permission("admin"))):
    """
    Admin-only: Initializes the scouting database for a given event key.
    Pulls data from TBA and creates empty records for each team in each match.
    """
    try:
        matches = tba_fetcher.get_event_data(event)["matches"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch event data: {str(e)}")

    # Insert match data into the database using async calls
    for match in matches:
        match_key = match["key"].split("_")[-1]  # e.g., qm1
        for alliance in enums.AllianceType:
            for team_key in match["alliances"][alliance.value]["team_keys"]:
                team_number = int(team_key[3:])
                # Use db.py to insert match scouting data asynchronously
                await db.add_match_scouting(
                    match=match_key,
                    m_type=enums.MatchType.QUALIFIER,  # Assuming match type is "qm" for simplicity
                    team=team_number,
                    alliance=alliance,  # Directly using the Enum value
                    scouter=None,
                    status=enums.StatusType.UNCLAIMED,
                    data={}
                )

    return {"status": "event initialized", "matches": len(matches)}


@router.patch("/scouting/{m_type}/{match}/{team}/state")
async def update_state(
    match: int,
    team: int,
    scouter: str,                      # query param: desired scouter or "__UNCLAIM__"
    status: enums.StatusType,
    m_type: enums.MatchType,
    _: enums.SessionInfo = Depends(db.require_permission("match_scouting")),
):
    # normalize enum
    if not isinstance(m_type, enums.MatchType):
        m_type = enums.MatchType(m_type)

    rows = await db.get_match_scouting(match=match, m_type=m_type, team=team)
    if not rows:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry = rows[0]

    # normalize row match_type to enum
    if not isinstance(entry["match_type"], enums.MatchType):
        entry["match_type"] = enums.MatchType(entry["match_type"])

    current_scouter: str | None = entry["scouter"]
    desired_scouter: str | None = None if scouter == "__UNCLAIM__" else scouter

    # Determine if we’re changing scouter or just status/data
    scouter_change = (desired_scouter != current_scouter)

    # One call updates both (merge data=None)
    try:
        await db.update_match_scouting(
            match=entry["match"],
            m_type=entry["match_type"],
            team=entry["team"],
            scouter=current_scouter,   # where-clause scouter (None → "__NONE__")
            status=status,                     # keep same if you want: pass entry["status"]
            data=None,
            scouter_new=desired_scouter,       # target scouter (None or name)
        )
    except HTTPException as e:
        # 409 can happen if target (match, m_type, team, scouter_new) already exists
        if e.status_code == 409:
            raise
        raise

    return {
        "status": "patched",
        "scouter": desired_scouter,
        "phase": status,
        "changed_scouter": scouter_change,
    }




@router.patch("/scouting/{m_type}/{match}/{team}/{scouter}")
async def update_match(
    match: int,
    team: int,
    scouter: str,                  # desired scouter; use "__UNCLAIM__" to clear
    m_type: enums.MatchType,
    body: Dict[str, Any] = Body(...),
    _: enums.SessionInfo = Depends(db.require_permission("match_scouting")),
):
    # Normalize enum if it came in as str
    if not isinstance(m_type, enums.MatchType):
        m_type = enums.MatchType(m_type)

    # Fetch existing row (without scouter to find the current owner)
    rows = await db.get_match_scouting(match=match, m_type=m_type, team=team)
    if not rows:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry = rows[0]
    if not isinstance(entry["match_type"], enums.MatchType):
        entry["match_type"] = enums.MatchType(entry["match_type"])

    current_scouter: Optional[str] = entry["scouter"]
    desired_scouter: Optional[str] = None if scouter == "__UNCLAIM__" else scouter

    # Extract status from body if present; else keep current
    status: Optional[enums.StatusType] = None
    if "status" in body and body["status"] is not None:
        status = enums.StatusType(body["status"])

    # Strip meta fields from the stored data; keep the rest as the scouting payload
    META = {"match", "match_type", "team", "teamNumber", "scouter", "status"}
    data = {k: v for k, v in body.items() if k not in META}

    # Single atomic update: merge data, update status, optionally reassign scouter
    await db.update_match_scouting(
        match=match,
        m_type=m_type,
        team=team,
        scouter=current_scouter,
        status=status,          # None ⇒ keep existing
        data=data,              # merged into existing
        scouter_new=desired_scouter,
    )

    return {
        "status": "patched",
        "scouter": desired_scouter,
        "phase": status.value if status else entry["status"],
        "changed_scouter": desired_scouter != current_scouter,
    }


@router.post("/scouting/{match}/{team}/submit")
async def submit_data(
        match: int,
        team: int,
        full_data: enums.FullData,
        _: enums.SessionInfo = Depends(db.require_permission("match_scouting"))
):
    data = full_data.model_dump()
    data.pop("alliance", None)
    data.pop("scouter", None)
    data.pop("match_type", None)

    # Check if entry exists
    existing = await db.get_match_scouting(
        match=match,
        m_type=full_data.match_type,
        team=team,
        scouter=full_data.scouter
    )

    if not existing:
        # Add it first
        await db.add_match_scouting(
            match=match,
            m_type=full_data.match_type,
            team=team,
            alliance=full_data.alliance,
            scouter=full_data.scouter,
            status=enums.StatusType.POST,  # Initial status before submit
            data={}  # Start with empty data
        )

    # Then update it with the submitted data
    await db.update_match_scouting(
        match=match,
        m_type=full_data.match_type,
        team=team,
        scouter=full_data.scouter,
        status=enums.StatusType.SUBMITTED,
        data=data
    )

    return {"status": "submitted"}


@router.get("/scouting/current")
async def get_current_scouting(
        session: enums.SessionInfo = Depends(db.require_permission("match_scouting"))
) -> Optional[dict]:
    scouter = session.get("name")
    if not scouter:
        raise HTTPException(status_code=400, detail="Scouter name not found in session")

    entries = await db.get_match_scouting(scouter=scouter)
    for e in entries:
        if e["status"] != "submitted":
            return e

    return None


@router.get("/match/{match}/{alliance}/{m_type}")
async def get_match_info(
        match: int,
        alliance: enums.AllianceType,
        m_type: enums.MatchType,
        _: enums.SessionInfo = Depends(db.require_permission("match_scouting"))
):
    # TODO: HARD CODED EVENT
    event_key = "2025caoc"
    try:
        team_numbers = tba_fetcher.get_match_alliance_teams_cached(event_key, m_type.value, match, alliance.value)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=404, detail=str(e))

    # Ensure each team has an entry in the database
    for t in team_numbers:
        existing = await db.get_match_scouting(match=match, m_type=m_type, team=str(t))
        if not existing:
            await db.add_match_scouting(
                match=match,
                m_type=m_type,
                team=t,
                alliance=alliance,
                scouter=None,
                status=enums.StatusType.UNCLAIMED,
                data={}
            )

    return {
        "teams": [
            {
                "number": int(t),
                "name": tba_fetcher.fetch_team_name_cached(f"frc{t}"),
                "logo": tba_fetcher.resolve_team_logo_cached(int(t)),
                "scouter": (await db.get_match_scouting(match=match, m_type=m_type, team=t))[0].get("scouter")
            }
            for t in team_numbers
        ]
    }


@router.get("/teams/{team}")
async def get_team_info(
        team: int,
        request: Request,
        _: enums.SessionInfo = Depends(db.require_permission("match_scouting"))

):
    """
    Returns basic info (number, nickname, logo URL) for a given team.
    Uses preloaded CSV data.
    """
    # Load team data from db or preloaded CSV
    if team not in request.app.state.team_data:
        raise HTTPException(status_code=404, detail="Team not found")

    return {
        "number": team,
        "name": request.app.state.team_data[team],
        "iconUrl": f"/assets/teams/{team}.png"
    }


@router.get("/status/{match}/{team}")
async def get_status(
        match: str,
        team: str,
        _: enums.SessionInfo = Depends(db.require_permission("match_scouting"))
):
    if match == "All" and team == "All":
        all_entries = await db.get_match_scouting(None, None, None, None)
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

    entries = await db.get_match_scouting(match=match_int, m_type=None, team=team_int, scouter=None)
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


@router.get("/data/processed")
async def get_data_processed(_: enums.SessionInfo = Depends(db.require_permission("admin"))):
    rows = await db.get_processed_data()
    #print(rows)
    return {
        "data": rows,
    }


@router.get("/poll/match/{match}/{m_type}/{alliance}")
async def poll_scouter_changes(
        match: int,
        m_type: enums.MatchType,
        alliance: str,
        client_ts: str = "",
        _: enums.SessionInfo = Depends(db.require_permission("match_scouting"))
):
    timeout_ns = 10 * 1_000_000_000  # 10 seconds in nanoseconds
    check_interval = 0.2  # seconds

    def parse_ts(ts: str) -> int:
        try:
            return int(ts)
        except Exception:
            return 0

    client_ns = parse_ts(client_ts)

    async def get_current_state():
        entries = await db.get_match_scouting(match=match, m_type=m_type)
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


@router.get("/poll/admin_match/{match}/{match_type}")
async def poll_admin_match_changes(
        match: int,
        match_type: str,
        client_ts: str = "",
        _: enums.SessionInfo = Depends(db.require_permission("admin"))
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
        entries = await db.get_match_scouting(match=match)
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
