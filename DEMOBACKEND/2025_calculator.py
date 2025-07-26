import sqlite3
import json
import time
from typing import Dict, List, Any

DB_PATH = "match_scouting.db"


# ─── DB Connection ────────────────────────────────────────────────
def get_conn():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


# ─── Prediction Logic ─────────────────────────────────────────────
def get_team_history(team: str) -> List[Dict[str, Any]]:
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
                   SELECT data
                   FROM match_scouting
                   WHERE team = ?
                     AND status = 'submitted'
                   """, (team,))
    rows = cursor.fetchall()
    return [json.loads(r[0]) for r in rows if r[0]]


def calculate_epa(history: List[Dict[str, Any]]) -> Dict[str, float]:
    auto = teleop = endgame = 0
    count = 0

    for match in history:
        try:
            auto += match.get("auto_score", 0)
            teleop += match.get("teleop_score", 0)
            endgame += match.get("endgame_score", 0)
            count += 1
        except Exception:
            continue

    if count == 0:
        return {"auto": 0, "teleop": 0, "endgame": 0, "total": 0}

    return {
        "auto": auto / count,
        "teleop": teleop / count,
        "endgame": endgame / count,
        "total": (auto + teleop + endgame) / count
    }


def predict_match(red: List[str], blue: List[str]) -> Dict[str, Any]:
    def avg_epa(team_list: List[str]):
        scores = [calculate_epa(get_team_history(t)) for t in team_list]
        avg = {
            "auto": sum(s["auto"] for s in scores) / len(scores),
            "teleop": sum(s["teleop"] for s in scores) / len(scores),
            "endgame": sum(s["endgame"] for s in scores) / len(scores),
        }
        avg["total"] = avg["auto"] + avg["teleop"] + avg["endgame"]
        return avg

    red_stats = avg_epa(red)
    blue_stats = avg_epa(blue)

    total = red_stats["total"] + blue_stats["total"] or 1  # prevent div by zero

    return {
        "red": red_stats,
        "blue": blue_stats,
        "win_prob_red": red_stats["total"] / total,
        "win_prob_blue": blue_stats["total"] / total
    }


# ─── Engine ───────────────────────────────────────────────────────
class PredictionEngine:
    def __init__(self, interval_sec: int = 30):
        self.conn = get_conn()
        self.interval = interval_sec
        self.create_table_if_needed()

    def create_table_if_needed(self):
        self.conn.execute("""
                          CREATE TABLE IF NOT EXISTS match_predictions
                          (
                              match
                              INTEGER,
                              match_type
                              TEXT,
                              red1
                              TEXT,
                              red2
                              TEXT,
                              red3
                              TEXT,
                              blue1
                              TEXT,
                              blue2
                              TEXT,
                              blue3
                              TEXT,
                              red_epa
                              REAL,
                              blue_epa
                              REAL,
                              win_prob_red
                              REAL,
                              win_prob_blue
                              REAL,
                              updated_at
                              INTEGER,
                              PRIMARY
                              KEY
                          (
                              match,
                              match_type
                          )
                              )
                          """)
        self.conn.commit()

    def get_upcoming_matches(self) -> List[Dict[str, Any]]:
        # Replace this with your real source of upcoming match data
        try:
            cursor = self.conn.cursor()
            cursor.execute("""
                           SELECT DISTINCT match, match_type
                           FROM match_scouting
                           """)
            matches = cursor.fetchall()

            result = []
            for match, match_type in matches:
                cursor.execute("""
                               SELECT team, alliance
                               FROM match_scouting
                               WHERE match = ? AND match_type = ?
                               """, (match, match_type))
                team_data = cursor.fetchall()
                red = [t for t, a in team_data if a == "red"]
                blue = [t for t, a in team_data if a == "blue"]
                if len(red) == 3 and len(blue) == 3:
                    result.append({
                        "match": match,
                        "match_type": match_type,
                        "red": red,
                        "blue": blue
                    })
            return result
        except Exception as e:
            print("Error loading matches:", e)
            return []

    def update_prediction(self, match: int, match_type: str, red: List[str], blue: List[str]):
        pred = predict_match(red, blue)

        self.conn.execute("""
            INSERT OR REPLACE INTO match_predictions
            (match, match_type, red1, red2, red3, blue1, blue2, blue3,
             red_epa, blue_epa, win_prob_red, win_prob_blue, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            match, match_type,
            *red, *blue,
            pred["red"]["total"],
            pred["blue"]["total"],
            pred["win_prob_red"],
            pred["win_prob_blue"],
            int(time.time())
        ))
        self.conn.commit()
        print(f"[Updated] Match {match_type}-{match}: Red {pred['red']['total']:.1f}, Blue {pred['blue']['total']:.1f}")

    def run(self):
        while True:
            matches = self.get_upcoming_matches()
            for match in matches:
                self.update_prediction(
                    match["match"],
                    match["match_type"],
                    match["red"],
                    match["blue"]
                )
            time.sleep(self.interval)


# ─── Entrypoint ───────────────────────────────────────────────────
if __name__ == "__main__":
    engine = PredictionEngine()
    engine.run()
