import sqlite3
import json
import time
from typing import Dict, List, Any
import pandas as pd

DB_PATH = "../DEMOBACKEND/data.db"


# ─── Utilities ────────────────────────────────────────────────────
def get_conn():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


# ─── Data Fetcher ─────────────────────────────────────────────────
class DataFetcher:
    def __init__(self, conn):
        self.conn = conn

    def get_team_history(self, team: str) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT data FROM match_scouting
            WHERE team = ? AND status = 'submitted'
        """, (team,))
        rows = cursor.fetchall()
        return [json.loads(r[0]) for r in rows if r[0]]

    def get_upcoming_matches(self) -> List[Dict[str, Any]]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT DISTINCT match, match_type FROM match_scouting")
        matches = cursor.fetchall()

        result = []
        for match, match_type in matches:
            cursor.execute("""
                SELECT team, alliance FROM match_scouting
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


class CSVDataFetcher:
    def __init__(self, csv_path: str):
        self.df = pd.read_csv(csv_path)
        self.columns = self.df.columns.tolist()
        self.team_data = self._parse_team_data()

    def _parse_team_data(self) -> List[Dict[str, Any]]:
        teams = []
        for col in self.columns:
            values = self.df[col].tolist()
            match_num = values[0]
            team_num = values[1]
            alliance_color = values[2]

            data = {
                "match": match_num,
                "match_type": "qm",
                "team": str(team_num),
                "alliance": "red" if "red" in str(alliance_color).lower() else "blue",
                "auto_score": sum(int(values[i]) for i in range(3, 9)),     # autonCoral L4-L1, Missed
                "teleop_score": sum(int(values[i]) for i in range(10, 16)), # matchCoral L4-L1, Missed
                "endgame_score": int(values[16])                            # matchNet
            }
            teams.append(data)
        return teams

    def get_team_history(self, team: str) -> List[Dict[str, Any]]:
        return [t for t in self.team_data if t["team"] == team]

    def get_upcoming_matches(self) -> List[Dict[str, Any]]:
        match_dict: Dict[str, Dict[str, List[str]]] = {}

        for entry in self.team_data:
            key = f"{entry['match']}_{entry['match_type']}"
            if key not in match_dict:
                match_dict[key] = {"red": [], "blue": []}
            match_dict[key][entry["alliance"]].append(entry["team"])

        results = []
        for key, alliances in match_dict.items():
            match, match_type = key.split("_")
            if len(alliances["red"]) == 3 and len(alliances["blue"]) == 3:
                results.append({
                    "match": int(match),
                    "match_type": match_type,
                    "red": alliances["red"],
                    "blue": alliances["blue"]
                })
        return results


# ─── Calculator ──────────────────────────────────────────────────
class EPACalculator:
    def __init__(self, fetcher: DataFetcher):
        self.fetcher = fetcher

    def calculate_epa(self, history: List[Dict[str, Any]]) -> Dict[str, float]:
        auto = teleop = endgame = 0
        count = 0

        for match in history:
            auto += match.get("auto_score", 0)
            teleop += match.get("teleop_score", 0)
            endgame += match.get("endgame_score", 0)
            count += 1

        if count == 0:
            return {"auto": 0, "teleop": 0, "endgame": 0, "total": 0}

        return {
            "auto": auto / count,
            "teleop": teleop / count,
            "endgame": endgame / count,
            "total": (auto + teleop + endgame) / count
        }

    def predict_match(self, red: List[str], blue: List[str]) -> Dict[str, Any]:
        def avg_epa(team_list: List[str]):
            scores = [self.calculate_epa(self.fetcher.get_team_history(t)) for t in team_list]
            avg = {
                "auto": sum(s["auto"] for s in scores) / len(scores),
                "teleop": sum(s["teleop"] for s in scores) / len(scores),
                "endgame": sum(s["endgame"] for s in scores) / len(scores),
            }
            avg["total"] = avg["auto"] + avg["teleop"] + avg["endgame"]
            return avg

        red_stats = avg_epa(red)
        blue_stats = avg_epa(blue)

        total = red_stats["total"] + blue_stats["total"] or 1

        return {
            "red": red_stats,
            "blue": blue_stats,
            "win_prob_red": red_stats["total"] / total,
            "win_prob_blue": blue_stats["total"] / total
        }


# ─── Prediction Writer ───────────────────────────────────────────
class PredictionWriter:
    def __init__(self, conn):
        self.conn = conn
        self.create_table_if_needed()

    def create_table_if_needed(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS match_predictions (
                match INTEGER,
                match_type TEXT,
                red1 TEXT,
                red2 TEXT,
                red3 TEXT,
                blue1 TEXT,
                blue2 TEXT,
                blue3 TEXT,
                red_epa REAL,
                blue_epa REAL,
                win_prob_red REAL,
                win_prob_blue REAL,
                updated_at INTEGER,
                PRIMARY KEY (match, match_type)
            )
        """)
        self.conn.commit()

    def write_prediction(self, match: int, match_type: str,
                         red: List[str], blue: List[str],
                         prediction: Dict[str, Any]):
        self.conn.execute("""
            INSERT OR REPLACE INTO match_predictions
            (match, match_type, red1, red2, red3, blue1, blue2, blue3,
             red_epa, blue_epa, win_prob_red, win_prob_blue, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            match, match_type,
            *red, *blue,
            prediction["red"]["total"],
            prediction["blue"]["total"],
            prediction["win_prob_red"],
            prediction["win_prob_blue"],
            int(time.time())
        ))
        self.conn.commit()
        print(f"[Updated] Match {match_type}-{match}: Red {prediction['red']['total']:.1f}, Blue {prediction['blue']['total']:.1f}")


class ConsoleWriter:
    def write_prediction(self, match: int, match_type: str,
                         red: List[str], blue: List[str],
                         prediction: Dict[str, Any]):
        print(f"\n[PREDICT] Match {match_type}-{match}")
        print(f"  🔴 Red:   {red} → EPA: {prediction['red']['total']:.1f} "
              f"(Win: {prediction['win_prob_red'] * 100:.1f}%)")
        print(f"  🔵 Blue:  {blue} → EPA: {prediction['blue']['total']:.1f} "
              f"(Win: {prediction['win_prob_blue'] * 100:.1f}%)")



# ─── Orchestrator ────────────────────────────────────────────────
class PredictionEngine:
    def __init__(self, interval_sec: int = 30):
        self.conn = get_conn()
        self.interval = interval_sec
        self.fetcher = DataFetcher(self.conn)
        self.fetcher = CSVDataFetcher("../DEMOBACKEND/validated_matches.csv")
        self.calculator = EPACalculator(self.fetcher)
        self.writer = PredictionWriter(self.conn)
        self.writer = ConsoleWriter()

    def run(self):
        while True:
            matches = self.fetcher.get_upcoming_matches()
            for match in matches:
                pred = self.calculator.predict_match(match["red"], match["blue"])
                self.writer.write_prediction(
                    match["match"], match["match_type"], match["red"], match["blue"], pred
                )
            time.sleep(self.interval)


# ─── Entrypoint ───────────────────────────────────────────────────
if __name__ == "__main__":
    PredictionEngine().run()
