# pylint: disable=line-too-long
"""Handles all large data calculation, including running the AI, Heuristics, and ELO team ranking and match prediction models"""
import sqlite3
import json
from collections import defaultdict

from pympler import asizeof
from pprint import pprint
from typing import Literal, Callable, Union
import pandas as pd
from calculators.KMeans_Clustering import compute_ai_ratings
from calculators.Bayesian_Elo_Calculator import make_quantile_binner, build_elo_games, train_feature_elo, team_axis_score

# --- Type aliases ---
AllianceType = Literal["red", "blue"]
MatchType = Literal["qm", "sf", "f"]
StatusType = Literal["unclaimed", "pre", "auto", "teleop", "post", "submitted"]


# --- Database Connection ---
def get_db_conn():
    """Gets database."""
    return sqlite3.connect("match_scouting.db", check_same_thread=False)


# --- Query Function ---
def get_match_scouting() -> list[dict]:
    """gets data from database."""
    conn = get_db_conn()
    cursor = conn.cursor()
    query = "SELECT * FROM match_scouting WHERE 1=1"
    params = []

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


def write_processed_string(value: str):
    """Writes a string to the first row, first column of the 'processed_data' table."""
    conn = get_db_conn()
    cursor = conn.cursor()

    # Ensure the table exists
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS processed_data
                   (
                       id
                       INTEGER
                       PRIMARY
                       KEY
                       AUTOINCREMENT,
                       value
                       TEXT
                   )
                   """)

    # Check if there's at least one row
    cursor.execute("SELECT id FROM processed_data ORDER BY id ASC LIMIT 1")
    row = cursor.fetchone()

    if row:
        # Update the first row
        cursor.execute("UPDATE processed_data SET value = ? WHERE id = ?", (value, row[0]))
    else:
        # Insert new row
        cursor.execute("INSERT INTO processed_data (value) VALUES (?)", (value,))

    conn.commit()
    conn.close()


def get_match_scouting_from_json(path: str = "converted_matches.json") -> list[dict]:
    """Gets match scouting data from a JSON file instead of the database."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return [
        {
            "match": entry["match"],
            "match_type": entry["match_type"],
            "team": entry["team"],
            "alliance": entry["alliance"],
            "scouter": entry["scouter"],
            "status": entry["status"],
            "data": entry["data"],
            "last_modified": entry.get("last_modified", "")
        }
        for entry in data
    ]


# --- Utility Functions ---
def safe_div(numerator, denominator):
    """ZeroDivisionError safe division of numerator by denominator."""
    return numerator / denominator if denominator else 0.0


# --- Main computing function ---
def compute_elos(
        per_match_data: dict,
        metric_extractors: dict[str, Union[
            Callable[[dict], float],  # team-level
            Callable[[dict[str, dict], dict[str, dict]], dict[str, float]]  # alliance-level
        ]],
        base: float = 1000.0,
        K: float = 32.0,
) -> dict[str, dict[str, float]]:
    """Generalized ELO calculator for arbitrary metrics (team or alliance scoped)."""
    # 1. Flatten & sort all valid matches
    order = {"qm": 0, "sf": 1, "f": 2}
    matches = []
    for mtype, mdict in per_match_data.items():
        for mnum, md in mdict.items():
            if not isinstance(md, dict):
                continue
            if "red" not in md or "blue" not in md:
                continue
            matches.append((order.get(mtype, 99), mnum, md))
    matches.sort(key=lambda x: (x[0], x[1]))

    # 2. Initialize team set & ELO table
    teams = set()
    for _, _, md in matches:
        teams |= set(md["red"]) | set(md["blue"])
    elo = {team: {metric: base for metric in metric_extractors} for team in teams}

    # 3. Metric updates
    def expected(er, eb):
        return 1 / (1 + 10 ** ((eb - er) / 400))

    for _, _, md in matches:
        red, blue = md["red"], md["blue"]

        for metric, extractor in metric_extractors.items():
            if extractor.__code__.co_argcount == 1:
                # Team-level extractor
                for r in red:
                    for b in blue:
                        vr, vb = extractor(red[r]), extractor(blue[b])
                        er, eb = elo[r][metric], elo[b][metric]
                        exp = expected(er, eb)
                        act = 1.0 if vr > vb else 0.0 if vr < vb else 0.5
                        delta = K * (act - exp)
                        elo[r][metric] += delta
                        elo[b][metric] -= delta
            else:
                # Alliance-level extractor
                red_vals = extractor(red, blue)
                blue_vals = extractor(blue, red)
                for r in red:
                    for b in blue:
                        vr, vb = red_vals.get(r, 0), blue_vals.get(b, 0)
                        er, eb = elo[r][metric], elo[b][metric]
                        exp = expected(er, eb)
                        act = 1.0 if vr > vb else 0.0 if vr < vb else 0.5
                        delta = K * (act - exp)
                        elo[r][metric] += delta
                        elo[b][metric] -= delta

    return elo


# pylint: disable=too-many-locals, too-many-branches
def compute_all_stats(raw_data: list[dict]) -> dict:
    """Main function."""
    submitted_matches = [match for match in raw_data if match["status"] == "submitted"]

    # === Verification: Check each alliance has 3 teams per match ===
    match_alliance_counts = defaultdict(lambda: {"red": set(), "blue": set()})
    for entry in submitted_matches:
        key = (entry["match_type"], entry["match"])
        match_alliance_counts[key][entry["alliance"]].add(entry["team"])

    invalid_matches = set()
    for (match_type, match_num), alliance_teams in match_alliance_counts.items():
        for alliance, teams in alliance_teams.items():
            if len(teams) != 3:
                invalid_matches.add((match_type, match_num))
                break  # no need to check the other alliance

    cleaned_data = [
        entry for entry in submitted_matches
        if (entry["match_type"], entry["match"]) not in invalid_matches
    ]

    print(f"Removed {len(invalid_matches)} invalid matches")

    per_match_data = {}
    per_team_data = {}

    team_match_records = []

    print("Finished cleanup")

    # TODO: update climb score based on pit scouting
    # ======= Step 1: Calculate basic per match per team data =======
    for match in submitted_matches:
        # ======= Step 1.0: Initialize variables =======
        match_type = match["match_type"]
        match_num = match["match"]
        alliance = match["alliance"]
        team = match["team"]

        # Initialize per_match_data[match_type][match_num][alliance][team] = {}
        if match_type not in per_match_data:
            per_match_data[match_type] = {}
        if match_num not in per_match_data[match_type]:
            per_match_data[match_type][match_num] = {}
        if alliance not in per_match_data[match_type][match_num]:
            per_match_data[match_type][match_num][alliance] = {}
        per_match_data[match_type][match_num][alliance][team] = {}
        match_result = per_match_data[match_type][match_num][alliance][team]

        # Initialize per_team_data[team]["match"]
        if team not in per_team_data:
            per_team_data[team] = {"match": []}
        per_team_data[team]["match"].append((match_type, match_num))

        teleop = match["data"]["teleop"]
        auto = match["data"]["auto"]

        # ===== Step 1.1: Parse branch placement =====
        teleop_branches = {k: 0 for k in ["l2", "l3", "l4"]}
        for branch in teleop["branchPlacement"].values():
            for level in teleop_branches:
                if branch[level]:
                    teleop_branches[level] += 1

        auto_branches = {k: 0 for k in ["l2", "l3", "l4"]}
        for branch in auto["branchPlacement"].values():
            for level in auto_branches:
                if branch[level]:
                    auto_branches[level] += 1

        # ===== Step 1.2: Calculate accuracy metrics in teleop =====
        match_result["teleop_scoring_location"] = {}

        l1_total = teleop["l1"] + teleop["missed"]["l1"]
        match_result["teleop_scoring_location"]["l1"] = {
            "accuracy": safe_div(teleop["l1"], l1_total),
            "total_attempt": l1_total,
        }

        algae_total = teleop["barge"] + teleop["missAlgae"]
        match_result["teleop_scoring_location"]["barge"] = {
            "accuracy": safe_div(teleop["barge"], algae_total),
            "total_attempt": algae_total,
        }

        for level, _ in {"l2": 3, "l3": 4, "l4": 5}.items():
            total = teleop["missed"][level] + teleop_branches[level]
            match_result["teleop_scoring_location"][level] = {
                "accuracy": safe_div(teleop_branches[level], total),
                "total_attempt": total,
            }

        # ===== Step 1.3: Calculate all score values =====
        auto_score = {
            "l4": auto_branches["l4"] * 7,
            "l3": auto_branches["l3"] * 6,
            "l2": auto_branches["l2"] * 4,
            "l1": auto["l1"] * 3,
            "barge": auto["barge"] * 4,
            "processor": auto["processor"] * 2,
            "move": 3 if auto["moved"] else 0,
            "coral": 0,
            "algae": 0
        }

        teleop_score = {
            "l4": teleop_branches["l4"] * 5,
            "l3": teleop_branches["l3"] * 4,
            "l2": teleop_branches["l2"] * 3,
            "l1": teleop["l1"] * 2,
            "barge": teleop["barge"] * 4,
            "processor": teleop["processor"] * 2,
            "coral": 0,
            "algae": 0
        }

        climb_score = int(match["data"]["postmatch"]["climbSpeed"] * 12) if match["data"]["postmatch"][
            "climbSuccess"] else 0
        match_result["score_breakdown"] = {
            "auto": auto_score,
            "teleop": teleop_score,
            "climb": climb_score,
            "total": 0
        }

        match_result["score_breakdown"]["total"] = (
                sum(auto_score.values()) +
                sum(teleop_score.values()) +
                climb_score
        )

        auto_score["coral"] = auto_score["l1"] + auto_score["l2"] + auto_score["l3"] + auto_score["l4"]
        auto_score["algae"] = auto_score["barge"] + auto_score["processor"]
        teleop_score["coral"] = teleop_score["l1"] + teleop_score["l2"] + teleop_score["l3"] + teleop_score["l4"]
        teleop_score["algae"] = teleop_score["barge"] + teleop_score["processor"]

        # ===== Step 1.4: Compute score actions (raw counts) =====
        match_result["score_actions"] = {
            "auto": {
                "l4": auto_branches["l4"],
                "l3": auto_branches["l3"],
                "l2": auto_branches["l2"],
                "l1": auto["l1"],
                "barge": auto["barge"],
                "processor": auto["processor"],
                "move": 1 if auto["moved"] else 0,
                "coral_cycle": sum(auto_branches.values()),
                "algae_cycle": auto["barge"] + auto["processor"]
            },
            "teleop": {
                "l4": teleop_branches["l4"],
                "l3": teleop_branches["l3"],
                "l2": teleop_branches["l2"],
                "l1": teleop["l1"],
                "barge": teleop["barge"],
                "processor": teleop["processor"],
                "coral_cycle": sum(teleop_branches.values()),
                "algae_cycle": teleop["barge"] + teleop["processor"]
            },
            "climb": int(match["data"]["postmatch"]["climbSpeed"] * 12) if match["data"]["postmatch"][
                "climbSuccess"] else 0,
        }

        team_match_records.append(match_result)

    print("Finished heuristics based calculations")

    # ======= Step 2: Calculate elo ranking =======
    def defense_metric(red: dict, blue: dict) -> dict[str, float]:
        avg_opponent = sum(t["score_breakdown"]["total"] for t in blue.values()) / len(blue)
        return {team: -avg_opponent for team in red}

    elo_extractors = {
        "team": lambda d: d["score_breakdown"]["total"],
        "auto": lambda d: sum(d["score_breakdown"]["auto"].values()),
        "teleop_coral": lambda d: d["score_actions"]["teleop"]["coral_cycle"],
        "teleop_algae": lambda d: d["score_breakdown"]["teleop"]["algae"],
        "climb": lambda d: d["score_actions"]["climb"] if isinstance(d["score_actions"]["climb"], int)
                 else sum(d["score_actions"]["climb"].values()),
        "defense": defense_metric
    }

    elo_scores = compute_elos(per_match_data, elo_extractors)

    for team, scores in elo_scores.items():
        per_team_data[team]["elo"] = scores

    print("Finished basic elo calculations")

    # ======= Step 3: Calculate featured elo rating =======
    coral_extractor = lambda d: d["score_actions"]["teleop"]["coral_cycle"]
    auto_extractor = lambda d: d["score_actions"]["auto"]["coral_cycle"]
    algae_extractor = lambda d: d["score_actions"]["teleop"]["algae_cycle"]
    climb_extractor = lambda d: d["score_actions"]["climb"]
    defense_extractor = lambda d: d.get("defense_effect", 0)

    coral_binner = make_quantile_binner(team_match_records, coral_extractor, tag_prefix="coral")
    auto_binner = make_quantile_binner(team_match_records, auto_extractor, tag_prefix="auto")
    algae_binner = make_quantile_binner(team_match_records, algae_extractor, tag_prefix="algae")
    climb_binner = make_quantile_binner(team_match_records, climb_extractor, tag_prefix="climb")
    defense_binner = make_quantile_binner(team_match_records, defense_extractor,
                                                             tag_prefix="defense")

    coral_elo = train_feature_elo(build_elo_games(per_match_data, coral_binner))
    auto_elo = train_feature_elo(build_elo_games(per_match_data, auto_binner))
    algae_elo = train_feature_elo(build_elo_games(per_match_data, algae_binner))
    climb_elo = train_feature_elo(build_elo_games(per_match_data, climb_binner))
    defense_elo = train_feature_elo(
        build_elo_games(per_match_data, defense_binner))

    for team in per_team_data:
        team_matches = [
            per_match_data[typ][num][alli][team]
            for typ, num in per_team_data[team]["match"]
            for alli in ["red", "blue"]
            if team in per_match_data[typ][num].get(alli, {})
        ]

        per_team_data[team]["elo_featured"] = {
            "auto": team_axis_score(team_matches, auto_elo, auto_binner),
            "teleop_coral": team_axis_score(team_matches, coral_elo, coral_binner),
            "teleop_algae": team_axis_score(team_matches, algae_elo, algae_binner),
            "climb": team_axis_score(team_matches, climb_elo, climb_binner),
            "defense": team_axis_score(team_matches, defense_elo, defense_binner),
        }

    print("Finished feature based elo calculations")

    # ======= Step 4: Calculate kmean ranking =======
    def teleop_base_fields(_, __, ___, data):
        sa = data["score_actions"]
        teleop = sa["teleop"]
        return {
            "l1": teleop.get("l1", 0),
            "l2": teleop.get("l2", 0),
            "l3": teleop.get("l3", 0),
            "l4": teleop.get("l4", 0),
            "processor": teleop.get("processor", 0),
            "barge": teleop.get("barge", 0),
            "driver_skill": data.get("teleop_scoring_location", {}).get("l3", {}).get("accuracy", 0),
            "robot_speed": data.get("teleop_scoring_location", {}).get("barge", {}).get("accuracy", 0),
        }

    def extract_auto_fields(_, __, ___, data):
        auto = data.get("score_actions", {}).get("auto", {})
        return {
            "auton_coral_l1": auto.get("l1", 0),
            "auton_coral_l2": auto.get("l2", 0),
            "auton_coral_l3": auto.get("l3", 0),
            "auton_coral_l4": auto.get("l4", 0),
            "auton_processor": auto.get("processor", 0),
            "auton_barge": auto.get("barge", 0)
        }

    def extract_endgame_fields(_, __, ___, data):
        raw_climb = data.get("score_actions", {}).get("climb", 0)
        climb_val = raw_climb if isinstance(raw_climb, int) else sum(raw_climb.values())
        return {"climb": climb_val}

    field_extractors = [teleop_base_fields, extract_auto_fields, extract_endgame_fields]

    def add_efficiency_fields(df: pd.DataFrame) -> pd.DataFrame:
        # Coral: L1–L4
        df["coral_total"] = df.get("l1", 0) + df.get("l2", 0) + df.get("l3", 0) + df.get("l4", 0)
        df["coral_efficiency"] = df["coral_total"] / 135

        # Algae: processor + barge
        df["algae_total"] = df.get("processor", 0) + df.get("barge", 0)
        df["algae_efficiency"] = df["algae_total"] / 9

        return df

    derived_feature_functions = [add_efficiency_fields]

    category_calculators = [
        {
            "name": "auto",
            "fn": lambda df: (
                    df.get("auton_coral_l1", 0) * 3 +
                    df.get("auton_coral_l2", 0) * 4 +
                    df.get("auton_coral_l3", 0) * 6 +
                    df.get("auton_coral_l4", 0) * 7 +
                    df.get("auton_processor", 0) * 2 +
                    df.get("auton_barge", 0) * 4
            )
        },
        {
            "name": "teleop_coral",
            "fn": lambda df: (
                    df.get("l1", 0) * 2 +
                    df.get("l2", 0) * 3 +
                    df.get("l3", 0) * 4 +
                    df.get("l4", 0) * 5
            )
        },
        {
            "name": "teleop_algae",
            "fn": lambda df: (
                    df.get("processor", 0) * 2 +
                    df.get("barge", 0) * 4
            )
        },
        {
            "name": "climb",
            "fn": lambda df: df.get("climb", 0)
        },
        {
            "name": "defense",
            "fn": lambda df: df.get("defense_effect", 0)
        }
    ]

    ai_result = compute_ai_ratings(
        per_match_data,
        field_extractors=field_extractors,
        derived_feature_functions=derived_feature_functions,
        category_calculators=category_calculators,
        n_clusters=5
    )
    pd.set_option("display.max_rows", None)
    pd.set_option("display.max_columns", None)
    pd.set_option("display.width", 0)
    # Inject team-level AI stats into per_team_data
    for team, stats in ai_result["team_stats"].items():
        if team not in per_team_data:
            per_team_data[team] = {}
        per_team_data[team]["ai_stats"] = stats

    # Add cluster_summary as metadata
    per_team_data["_cluster_summary"] = ai_result["cluster_summary"]

    print("Finished KMeans clustering")

    # ======= Step 5: Rank teams =======
    # --- Initialize ranking field ---
    for team in per_team_data:
        if not str(team).startswith("_"):
            per_team_data[team]["ranking"] = {}

    # --- Rank overall (elo["team"]) ---
    scores = [
        (team, d["elo"]["team"])
        for team, d in per_team_data.items()
        if not str(team).startswith("_") and "elo" in d and "team" in d["elo"]
    ]
    scores.sort(key=lambda x: -x[1])

    last_score = None
    last_rank = 0
    position = 0
    for team, score in scores:
        position += 1
        if score != last_score:
            last_rank = position
            last_score = score
        per_team_data[team]["ranking"]["overall"] = last_rank

    # --- Rank each elo_featured aspect ---
    for feature in ["auto", "teleop_coral", "teleop_algae", "climb", "defense"]:
        scores = [
            (team, d["elo_featured"][feature])
            for team, d in per_team_data.items()
            if not str(team).startswith("_") and
               "elo_featured" in d and
               feature in d["elo_featured"] and
               d["elo_featured"][feature] is not None
        ]
        scores.sort(key=lambda x: -x[1])

        last_score = None
        last_rank = 0
        position = 0
        for team, score in scores:
            position += 1
            if score != last_score:
                last_rank = position
                last_score = score
            per_team_data[team]["ranking"][feature] = last_rank

        # Ensure all teams have the key (even if unranked)
        for team in per_team_data:
            if str(team).startswith("_"):
                continue
            if feature not in per_team_data[team]["ranking"]:
                per_team_data[team]["ranking"][feature] = 0

    # ======= Step 99: Return safe JSON-compatible output =======
    return {
        "team_data": per_team_data,
        "match_data": per_match_data
    }


# --- Script Entry Point ---
if __name__ == "__main__":
    print("Start fetching data")
    all_data = get_match_scouting_from_json()
    print("Fetched all data")
    # pprint(all_data)

    processed_data = compute_all_stats(all_data)
    print("Calculations finished")
    pprint(processed_data["team_data"])
    print("uncompressed size: " + str(asizeof.asizeof(processed_data)))
    print("compressed size: " + str(asizeof.asizeof(json.dumps(processed_data))))
    write_processed_string(json.dumps(processed_data))
    print("Write finished")

'''

format:
{team_data: {team_number: {ai_stats, elo, match}, _cluster_summary}, match_data: {match_type: {match_number: {alliance: {team_number: {score_actions, score_breakdown, teleop_scoring_location}}}}}}

    import matplotlib.pyplot as plt

    team_data = semi_processed_data["team_data"]

    # Flatten into a DataFrame
    records = []
    for team, data in team_data.items():
        if not isinstance(team, int):
            continue
        if "ai_stats" not in data or "elo" not in data:
            continue
        row = {
            "team": team,
            **data["ai_stats"],
            **{f"elo_{k}": v for k, v in data["elo"].items()}
        }
        records.append(row)

    df = pd.DataFrame(records)

    # Plot AI vs ELO for each available category
    for cat in ["auto", "teleop_coral", "teleop_algae"]:
        plt.figure(figsize=(6, 4))
        plt.scatter(df[cat], df[f"elo_{cat}"], alpha=0.7)
        plt.xlabel(f"AI {cat} score")
        plt.ylabel(f"ELO {cat} score")
        plt.title(f"AI vs ELO: {cat}")
        plt.grid(True)
        plt.tight_layout()
        plt.show()'''
