import asyncio
import aiohttp
import asyncpg
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

TBA_AUTH_KEY = os.getenv("TBA_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

BASE_URL = "https://www.thebluealliance.com/api/v3"

# -------------------- Fetch Teams --------------------
async def fetch_teams(session, page: int):
    url = f"{BASE_URL}/teams/{page}"
    headers = {"X-TBA-Auth-Key": TBA_AUTH_KEY}
    async with session.get(url, headers=headers) as resp:
        if resp.status != 200:
            print(f"[WARN] Failed to fetch page {page} (status {resp.status})")
            return []
        return await resp.json()

# -------------------- Insert Team --------------------
async def insert_team(conn, team):
    try:
        await conn.execute(
            """
            INSERT INTO teams (team_number, nickname, rookie_year, last_updated)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (team_number) DO UPDATE
            SET nickname = EXCLUDED.nickname,
                rookie_year = EXCLUDED.rookie_year,
                last_updated = EXCLUDED.last_updated
            """,
            team["team_number"],
            team["nickname"] or "Unknown",
            team["rookie_year"] or None,
            datetime.now(),
        )
    except Exception as e:
        print(f"[ERR] Team {team.get('team_number')}: {e}")

# -------------------- Main --------------------
async def main():
    print("[INFO] Starting TBA → Neon sync...")
    conn = await asyncpg.connect(DATABASE_URL)
    async with aiohttp.ClientSession() as session:
        page = 0
        total = 0

        while True:
            teams = await fetch_teams(session, page)
            if not teams:
                print(f"[INFO] No more teams (page {page}). Exiting.")
                break

            print(f"[PAGE {page}] Retrieved {len(teams)} teams from TBA.")

            # Sequential insert (safe + minimal overhead)
            for i, team in enumerate(teams, 1):
                await insert_team(conn, team)
                total += 1
                # Light heartbeat every 100 teams
                if i % 100 == 0:
                    print(f"    ↳ Inserted {i} / {len(teams)} (page {page})")

            print(f"[PAGE {page}] ✅ Completed page ({total} total).")
            page += 1

        print(f"[DONE] Inserted/updated {total} total teams.")
    await conn.close()
    print("[INFO] Connection closed.")

if __name__ == "__main__":
    asyncio.run(main())