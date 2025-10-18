import os
import asyncio
import asyncpg
import json
from dotenv import load_dotenv
from datetime import datetime, timezone

# 1. Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in .env")

# 2. Path to the file
JSON_FILE = "response_1760157833302.json"

# 3. Parse the file
with open(JSON_FILE, "r", encoding="utf-8") as f:
    matches = json.load(f)

# 4. Prepare insert data
records = []
for m in matches:
    if m["comp_level"] != "qm":  # only qualification matches
        continue

    red = [int(t[3:]) for t in m["alliances"]["red"]["team_keys"]]
    blue = [int(t[3:]) for t in m["alliances"]["blue"]["team_keys"]]

    # Convert predicted_time to proper timestamp
    t = datetime.fromtimestamp(m["predicted_time"], tz=timezone.utc)

    records.append((
        m["key"],
        m["event_key"],
        m["comp_level"],
        m["match_number"],
        m.get("set_number", 1),
        t,
        m.get("actual_time"),
        *red,
        *blue
    ))

# 5. SQL insert
SQL = """
INSERT INTO matches (
    key, event_key, match_type, match_number, set_number,
    scheduled_time, actual_time,
    red1, red2, red3,
    blue1, blue2, blue3
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
ON CONFLICT (event_key, match_type, match_number) DO NOTHING;
"""

# 6. Async insert
async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    async with conn.transaction():
        await conn.executemany(SQL, records)
    await conn.close()
    print(f"Inserted {len(records)} matches into database.")

if __name__ == "__main__":
    asyncio.run(main())
