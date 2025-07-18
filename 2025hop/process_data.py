"""
Contribution‑weighted Elo ranking for **coral pieces only** in FRC 2025 Reefscape.

Why this version? Statbotics’ public “Coral EPA” ignores algae, processors and
all end‑game actions—it counts nothing except the number of coral game pieces
scored by each robot. To make an apples‑to‑apples comparison we:

* **Include only coral columns** from the scouting sheet.
* Count **every coral piece as 1 point**, regardless of level.
* Remove all alliance caps—if a team feeds >12 pieces into L4, they get credit
  for every single one.
* Use a fixed K=32 so ten qualification matches are enough to spread ratings
  by ~±150 points, similar to Statbotics.

The core Elo math (share‑of‑points update) is unchanged.
"""

from __future__ import annotations

import pandas as pd
import numpy as np
from collections import defaultdict
from pathlib import Path

# -------------------------------------------------- CONFIG -------------------
CSV_PATH       = "validated_matches.csv"  # scouting export
INITIAL_RATING = 1500                      # Elo start
K_CONST        = 32                        # fixed K for every match

# ---- coral‑only columns -----------------------------------------------------
CORAL_COLS = {
    "Auton.autonCoral L4": "A_L4",
    "Auton.autonCoral L3": "A_L3",
    "Auton.autonCoral L2": "A_L2",
    "Auton.autonCoral L1": "A_L1",
    "Match.matchCoral L4": "T_L4",
    "Match.matchCoral L3": "T_L3",
    "Match.matchCoral L2": "T_L2",
    "Match.matchCoral L1": "T_L1",
}

# Every coral piece weighs 1.0 – Statbotics does the same for Coral EPA
POINTS = {code: 1.0 for code in CORAL_COLS.values()}

# ---------------------------------------------------------------------------
# HELPER
# ---------------------------------------------------------------------------

def coral_points(row: pd.Series) -> float:
    """Return the *number* of coral pieces this robot placed in the row."""
    total = 0.0
    for col, code in CORAL_COLS.items():
        cnt = row.get(col, 0)
        if pd.notna(cnt) and cnt > 0:
            total += cnt * POINTS[code]
    return total


# ---------------------------------------------------------------------------
# MAIN
# ---------------------------------------------------------------------------

def run_coral_elo(csv_path: str | Path = CSV_PATH) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    # Basic identifiers
    df["match_id"] = df["Pre Match.match_num"].astype(int)
    df["alliance"] = df["Pre Match.allianceColor"].str.capitalize()
    df["team"]     = df["Pre Match.teamNum"].astype(int)

    # How many coral pieces did this robot score in this match?
    df["coral"] = df.apply(coral_points, axis=1)

    # Sort chronologically; include eventKey if present so quals precede elims
    sort_cols = ["match_id"]
    if "Pre Match.eventKey" in df.columns:
        sort_cols.insert(0, "Pre Match.eventKey")
    df = df.sort_values(sort_cols)

    rating: dict[int, float] = defaultdict(lambda: INITIAL_RATING)
    played: defaultdict[int, int] = defaultdict(int)

    for _, match in df.groupby(sort_cols):
        for _, alliance_rows in match.groupby("alliance"):
            teams   = alliance_rows["team"].to_list()
            contrib = alliance_rows.set_index("team")["coral"].to_dict()

            pieces_total = sum(contrib.values())
            if pieces_total == 0:
                continue  # skip alliances that placed no coral at all

            weights = {t: 10 ** (rating[t] / 400) for t in teams}
            W_all   = sum(weights.values())

            for t in teams:
                exp_share = weights[t] / W_all
                obs_share = contrib[t] / pieces_total
                rating[t] += K_CONST * (obs_share - exp_share)
                played[t] += 1

    table = (
        pd.DataFrame({"Team": list(rating.keys()),
                       "Rating": list(rating.values()),
                       "Matches": [played[t] for t in rating]})
          .sort_values("Rating", ascending=False)
          .reset_index(drop=True)
    )
    table["Rating"] = table["Rating"].round(1)
    return table


if __name__ == "__main__":
    pd.set_option("future.no_silent_downcasting", True)
    elo_table = run_coral_elo()
    print(elo_table.to_string(index=False))
    # elo_table.to_csv("coral_elo_ratings.csv", index=False)
