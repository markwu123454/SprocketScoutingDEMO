import asyncio
import sys
import unittest
import asyncpg
import json
import time
import logging
from typing import Dict, Any, Optional, Callable, Annotated
from fastapi import HTTPException, Header, Depends
from datetime import datetime, timezone, timedelta
import uuid
from asyncpg import PostgresError
from asyncpg.exceptions import UniqueViolationError
import enums
import os, ssl
import certifi

# ---------- Logging ----------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------- PostgreSQL settings (single DB) ----------
DB_DSN = os.getenv("DATABASE_URL")
_pools: dict[str, asyncpg.Pool] = {}
DB_USER = "postgres"
DB_PASSWORD = "90Otter!"
DB_NAME = "data"          # <- single database for everything (data + sessions)
DB_HOST = "localhost"
DB_PORT = 5432

# Connection pools keyed by db name
_pools: dict[str, asyncpg.Pool] = {}

S_NONE = "__NONE__"  # sentinel stored when scouter is logically NULL


async def _setup_codecs(conn: asyncpg.Connection):
    # JSON/JSONB <-> dict, transparently
    await conn.set_type_codec("jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")
    await conn.set_type_codec("json",  encoder=json.dumps, decoder=json.loads, schema="pg_catalog")


async def get_db_connection(db: str) -> asyncpg.Connection:
    """
    Acquire a connection from (or lazily create) the pool for the given database.
    """
    pool = _pools.get(db)
    if pool is None:
        pool = await asyncpg.create_pool(
            user=DB_USER,
            password=DB_PASSWORD,
            database=db,
            host=DB_HOST,
            port=DB_PORT,
            min_size=1,
            max_size=10,
            init=_setup_codecs,
        )
        _pools[db] = pool
    return await pool.acquire()


async def release_db_connection(db: str, conn: asyncpg.Connection):
    pool = _pools.get(db)
    if pool is not None:
        await pool.release(conn)


async def close_pool():
    """Closes all connection pools."""
    for pool in _pools.values():
        await pool.close()
    _pools.clear()


def _to_db_scouter(s: Optional[str]) -> str:
    return S_NONE if s is None else s


def _from_db_scouter(s: str) -> Optional[str]:
    return None if s == S_NONE else s


# =================== Schema Init ===================

async def init_data_db():
    """
    Initializes tables in the single 'data' database:
      - match_scouting
      - processed_data
    """
    conn = await get_db_connection(DB_NAME)
    try:
        async with conn.transaction():
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS match_scouting (
                    match INTEGER NOT NULL,
                    match_type TEXT NOT NULL,
                    team TEXT NOT NULL,
                    alliance TEXT NOT NULL,
                    scouter TEXT NOT NULL, -- sentinel "__NONE__" used for logical NULL
                    status TEXT NOT NULL,
                    data JSONB NOT NULL,
                    last_modified BIGINT NOT NULL,
                    PRIMARY KEY (match, match_type, team, scouter)
                )
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_match_scouting_team ON match_scouting (team)")
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_ms_lookup
                ON match_scouting (match, match_type, team, scouter)
            """)
            await conn.execute("CREATE TABLE IF NOT EXISTS processed_data (data TEXT)")
    except PostgresError as e:
        logger.error("Failed to initialize data schema: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to initialize database: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


async def init_session_db():
    """
    Initializes the 'sessions' table in the same 'data' database.
    """
    conn = await get_db_connection(DB_NAME)
    try:
        async with conn.transaction():
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    uuid TEXT PRIMARY KEY,
                    data JSONB NOT NULL,
                    expires TIMESTAMP WITH TIME ZONE NOT NULL
                );
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires);")
    except PostgresError as e:
        logger.error("Failed to initialize sessions schema: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to initialize sessions schema: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


# =================== Match Scouting ===================

async def add_match_scouting(
    match: int,
    m_type: enums.MatchType,
    team: int | str,
    alliance: enums.AllianceType,
    scouter: str | None,
    status: enums.StatusType,
    data: Dict[str, Any]
):
    conn = await get_db_connection(DB_NAME)
    try:
        await conn.execute("""
            INSERT INTO match_scouting (match, match_type, team, alliance, scouter, status, data, last_modified)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, match, m_type.value, str(team), alliance.value, _to_db_scouter(scouter),
             status.value, data, time.time_ns())
    except UniqueViolationError:
        raise HTTPException(status_code=409, detail="Match scouting entry already exists")
    except PostgresError as e:
        logger.error("Failed to add match scouting data: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to add match scouting data: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


async def update_match_scouting(
    match: int,
    m_type: enums.MatchType,
    team: int | str,
    scouter: Optional[str],                # current value (None => "__NONE__")
    status: Optional[enums.StatusType] = None,
    data: Optional[Dict[str, Any]] = None,
    scouter_new: Optional[str] = None      # new desired value (claim/reassign)
):
    conn = await get_db_connection(DB_NAME)
    try:
        async with conn.transaction():
            row = await conn.fetchrow("""
                SELECT data, status
                FROM match_scouting
                WHERE match=$1 AND match_type=$2 AND team=$3 AND scouter=$4
                FOR UPDATE
            """, match, m_type.value, str(team), _to_db_scouter(scouter))
            if not row:
                raise HTTPException(status_code=404, detail="Match scouting entry not found")

            current_data: Dict[str, Any] = row["data"]
            if data:
                current_data |= data
            new_status = status.value if status else row["status"]
            new_scouter_db = _to_db_scouter(scouter_new) if scouter_new is not None else _to_db_scouter(scouter)

            try:
                await conn.execute("""
                    UPDATE match_scouting
                    SET data=$1, status=$2, last_modified=$3, scouter=$4
                    WHERE match=$5 AND match_type=$6 AND team=$7 AND scouter=$8
                """, current_data, new_status, time.time_ns(), new_scouter_db,
                     match, m_type.value, str(team), _to_db_scouter(scouter))
            except UniqueViolationError:
                raise HTTPException(status_code=409, detail="Target scouter row already exists")
    finally:
        await release_db_connection(DB_NAME, conn)


async def get_match_scouting(
    match: Optional[int] = None,
    m_type: Optional[enums.MatchType] = None,
    team: Optional[int | str] = None,
    scouter: Optional[str] = "__NOTPASSED__"
) -> list[Dict[str, Any]]:
    conn = await get_db_connection(DB_NAME)
    try:
        query = "SELECT * FROM match_scouting WHERE 1=1"
        params: list[Any] = []
        idx = 1

        if match is not None:
            query += f" AND match = ${idx}"; params.append(match); idx += 1
        if m_type is not None:
            query += f" AND match_type = ${idx}"; params.append(m_type.value); idx += 1
        if team is not None:
            query += f" AND team = ${idx}"; params.append(str(team)); idx += 1
        if scouter != "__NOTPASSED__":
            query += f" AND scouter = ${idx}"; params.append(_to_db_scouter(scouter if scouter != "" else None)); idx += 1

        rows = await conn.fetch(query, *params)

        return [
            {
                "match": r["match"],
                "match_type": r["match_type"],
                "team": r["team"],
                "alliance": r["alliance"],
                "scouter": _from_db_scouter(r["scouter"]),
                "status": r["status"],
                "data": r["data"],  # dict via codec
                "last_modified": r["last_modified"],
            }
            for r in rows
        ]
    except PostgresError as e:
        logger.error("Failed to fetch match scouting data: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch match scouting data: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


async def get_processed_data() -> Optional[str]:
    conn = await get_db_connection(DB_NAME)
    try:
        row = await conn.fetchrow("SELECT data FROM processed_data LIMIT 1")
        return row["data"] if row else None
    except PostgresError as e:
        logger.error("Failed to fetch processed data: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch processed data: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


# =================== Sessions (same DB) ===================

async def init_session_db():
    """(redeclared above) kept separate for clarity; same DB."""
    conn = await get_db_connection(DB_NAME)
    try:
        async with conn.transaction():
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    uuid TEXT PRIMARY KEY,
                    data JSONB NOT NULL,
                    expires TIMESTAMP WITH TIME ZONE NOT NULL
                );
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires);")
    except PostgresError as e:
        logger.error("Failed to initialize sessions schema: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to initialize sessions schema: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


async def add_session(session_id: str, session_data: Dict[str, Any], expires_dt: datetime):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    conn = await get_db_connection(DB_NAME)
    try:
        async with conn.transaction():
            await conn.execute("""
                INSERT INTO sessions (uuid, data, expires)
                VALUES ($1, $2, $3)
                ON CONFLICT (uuid) DO UPDATE
                SET data = EXCLUDED.data, expires = EXCLUDED.expires
            """, session_id, session_data, expires_dt)
    except PostgresError as e:
        logger.error("Failed to add session: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to add session: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


async def get_session_data(session_id: str) -> Optional[Dict[str, Any]]:
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    conn = await get_db_connection(DB_NAME)
    try:
        row = await conn.fetchrow("SELECT data FROM sessions WHERE uuid = $1", session_id)
        return row["data"] if row else None
    except PostgresError as e:
        logger.error("Failed to fetch session data: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to fetch session data: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


async def delete_session(session_id: str):
    try:
        uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    conn = await get_db_connection(DB_NAME)
    try:
        await conn.execute("DELETE FROM sessions WHERE uuid = $1", session_id)
    except PostgresError as e:
        logger.error("Failed to delete session: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


async def delete_all_sessions():
    conn = await get_db_connection(DB_NAME)
    try:
        await conn.execute("TRUNCATE sessions")
    except PostgresError as e:
        logger.error("Failed to delete all sessions: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to delete all sessions: {e}")
    finally:
        await release_db_connection(DB_NAME, conn)


async def verify_uuid(x_uuid: str, required: Optional[str] = None) -> Dict[str, Any]:
    try:
        uuid.UUID(x_uuid)
    except ValueError:
        logger.warning("Invalid UUID format")
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    conn = await get_db_connection(DB_NAME)
    try:
        row = await conn.fetchrow(
            "SELECT data, expires FROM sessions WHERE uuid = $1",
            x_uuid,
        )
        if not row:
            raise HTTPException(status_code=401, detail="Invalid session")

        expires: datetime = row["expires"]
        if expires <= datetime.now(timezone.utc):
            await conn.execute("DELETE FROM sessions WHERE uuid = $1", x_uuid)
            raise HTTPException(status_code=403, detail="Expired session")

        session = row["data"]  # dict via JSONB codec

        if required:
            perms = session.get("permissions", {})
            if not isinstance(perms, dict) or not perms.get(required, False):
                raise HTTPException(status_code=403, detail=f"Missing '{required}' permission")

        return session

    except PostgresError as e:
        logger.error("Database error verifying UUID: %s", e)
        raise HTTPException(status_code=500, detail="Database error verifying UUID")
    finally:
        await release_db_connection(DB_NAME, conn)


# =================== FastAPI dependencies ===================

def require_session() -> Callable[..., "SessionInfo"]:
    async def dep(x_uuid: Annotated[str, Header(alias="x-uuid")]) -> enums.SessionInfo:
        s = await verify_uuid(x_uuid)
        return enums.SessionInfo(
            name=s["name"],
            permissions=enums.SessionPermissions(**s["permissions"])
        )
    return dep


def require_permission(required: str) -> Callable[..., "SessionInfo"]:
    async def dep(session: enums.SessionInfo = Depends(require_session())) -> enums.SessionInfo:
        if not getattr(session.permissions, required, False):
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail=f"Missing '{required}' permission")
        return session
    return dep


# =================== Test Helpers ===================

# Windows event loop policy (asyncpg quirk)
if sys.platform.startswith("win"):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def _exec_raw(sql: str, *params):
    conn = await asyncpg.connect(
        user=DB_USER, password=DB_PASSWORD,
        database=DB_NAME, host=DB_HOST, port=DB_PORT
    )
    try:
        return await conn.execute(sql, *params)
    finally:
        await conn.close()


# =================== Tests ===================

class TestDAL(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.loop = asyncio.get_event_loop()
        # Init schemas once (single DB)
        cls.loop.run_until_complete(init_data_db())
        cls.loop.run_until_complete(init_session_db())

        # Ensure sessions.data is JSONB (defensive if existing)
        cls.loop.run_until_complete(_exec_raw(
            "ALTER TABLE sessions ALTER COLUMN data TYPE JSONB USING data::jsonb"
        ))

    @classmethod
    def tearDownClass(cls):
        cls.loop.run_until_complete(close_pool())

    def setUp(self):
        self._cleanup_match_keys = []
        self._cleanup_session_ids = []

    def tearDown(self):
        for match, team in self._cleanup_match_keys:
            try:
                self.loop.run_until_complete(
                    _exec_raw("DELETE FROM match_scouting WHERE match=$1 AND team=$2", match, team)
                )
            except Exception:
                pass
        for sid in self._cleanup_session_ids:
            try:
                self.loop.run_until_complete(
                    _exec_raw("DELETE FROM sessions WHERE uuid=$1", sid)
                )
            except Exception:
                pass

    def run_async(self, coro):
        return self.loop.run_until_complete(coro)

    # ---------- Match scouting tests ----------

    def test_add_and_get_match_scouting_basic(self):
        match_id = 100
        team_id = "54321"
        self._cleanup_match_keys.append((match_id, team_id))

        self.run_async(add_match_scouting(
            match=match_id,
            m_type=enums.MatchType.QUALIFIER,
            team=team_id,
            alliance=enums.AllianceType.RED,
            scouter=None,
            status=enums.StatusType.SUBMITTED,
            data={"score": 100, "notes": "t"}
        ))
        rows = self.run_async(get_match_scouting(
            match=match_id,
            m_type=enums.MatchType.QUALIFIER,
            team=team_id,
            scouter=None
        ))
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r["match"], match_id)
        self.assertEqual(r["match_type"], enums.MatchType.QUALIFIER.value)
        self.assertEqual(r["team"], team_id)
        self.assertEqual(r["alliance"], enums.AllianceType.RED.value)
        self.assertEqual(r["status"], enums.StatusType.SUBMITTED.value)
        self.assertEqual(r["data"]["score"], 100)
        self.assertIsInstance(r["last_modified"], int)

    def test_add_match_scouting_duplicate_conflict(self):
        match_id = 100
        team_id = "54322"
        self._cleanup_match_keys.append((match_id, team_id))

        args = dict(
            match=match_id,
            m_type=enums.MatchType.QUALIFIER,
            team=team_id,
            alliance=enums.AllianceType.BLUE,
            scouter="scoutA",
            status=enums.StatusType.PRE,
            data={"x": 1}
        )
        self.run_async(add_match_scouting(**args))
        with self.assertRaises(HTTPException) as cm:
            self.run_async(add_match_scouting(**args))
        self.assertEqual(cm.exception.status_code, 409)

    def test_update_match_scouting_merge_and_status(self):
        match_id = 100
        team_id = "54323"
        self._cleanup_match_keys.append((match_id, team_id))

        self.run_async(add_match_scouting(
            match=match_id,
            m_type=enums.MatchType.SEMIFINAL,
            team=team_id,
            alliance=enums.AllianceType.RED,
            scouter="alice",
            status=enums.StatusType.PRE,
            data={"score": 10, "a": 1}
        ))
        self.run_async(update_match_scouting(
            match=match_id,
            m_type=enums.MatchType.SEMIFINAL,
            team=team_id,
            scouter="alice",
            status=enums.StatusType.SUBMITTED,
            data={"score": 25, "b": 2}
        ))
        rows = self.run_async(get_match_scouting(
            match=match_id, m_type=enums.MatchType.SEMIFINAL, team=team_id, scouter="alice"
        ))
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r["status"], enums.StatusType.SUBMITTED.value)
        self.assertEqual(r["data"]["score"], 25)
        self.assertEqual(r["data"]["a"], 1)
        self.assertEqual(r["data"]["b"], 2)
        self.assertEqual(r["scouter"], "alice")

    def test_get_processed_data_missing_table_raises_500(self):
        try:
            self.run_async(_exec_raw("DROP TABLE IF EXISTS processed_data;"))
        except Exception:
            pass
        with self.assertRaises(HTTPException) as cm:
            self.run_async(get_processed_data())
        self.assertEqual(cm.exception.status_code, 500)

    # ---------- Session tests (same DB) ----------

    def test_add_get_delete_session(self):
        sid = str(uuid.uuid4())
        self._cleanup_session_ids.append(sid)
        exp = datetime.now(timezone.utc) + timedelta(minutes=30)
        payload = {"name": "tester", "admin": True}

        self.run_async(add_session(sid, payload, exp))
        got = self.run_async(get_session_data(sid))
        self.assertEqual(got["name"], "tester")
        self.assertTrue(got["admin"])

        self.run_async(delete_session(sid))
        self.assertIsNone(self.run_async(get_session_data(sid)))
        self._cleanup_session_ids.remove(sid)

    def test_verify_uuid_valid_with_required(self):
        sid = str(uuid.uuid4())
        self._cleanup_session_ids.append(sid)
        exp = datetime.now(timezone.utc) + timedelta(minutes=10)
        payload = {"name": "ok", "permissions": {"admin": True}}

        self.run_async(add_session(sid, payload, exp))
        v = self.run_async(verify_uuid(sid, required="admin"))
        self.assertTrue(v["permissions"]["admin"])

    def test_verify_uuid_missing_required_permission(self):
        sid = str(uuid.uuid4())
        self._cleanup_session_ids.append(sid)
        exp = datetime.now(timezone.utc) + timedelta(minutes=10)
        payload = {"name": "nope", "permissions": {"admin": False}}

        self.run_async(add_session(sid, payload, exp))
        with self.assertRaises(HTTPException) as cm:
            self.run_async(verify_uuid(sid, required="admin"))
        self.assertEqual(cm.exception.status_code, 403)

    def test_verify_uuid_invalid_format(self):
        with self.assertRaises(HTTPException) as cm:
            self.run_async(verify_uuid("not-a-uuid"))
        self.assertEqual(cm.exception.status_code, 400)

    def test_verify_uuid_expired_and_auto_delete(self):
        sid = str(uuid.uuid4())
        self._cleanup_session_ids.append(sid)
        exp = datetime.now(timezone.utc) - timedelta(minutes=1)
        payload = {"name": "expired", "permissions": {"admin": True}}

        self.run_async(add_session(sid, payload, exp))
        with self.assertRaises(HTTPException) as cm:
            self.run_async(verify_uuid(sid))
        self.assertEqual(cm.exception.status_code, 403)
        self.assertIsNone(self.run_async(get_session_data(sid)))
        self._cleanup_session_ids.remove(sid)


if __name__ == "__main__":
    unittest.main(verbosity=2)
