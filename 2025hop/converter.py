import pandas as pd
import json

# === Constants ===
coral_keys = list("ABCDEFGHIJKL")
algae_lanes = ["AB", "CD", "EF", "GH", "IJ", "KL"]


# === Helper functions ===
def safe_int(val):
    try:
        return int(val)
    except (ValueError, TypeError):
        return 0


def safe_float(val):
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0.0


def generate_branch_map(l2, l3, l4):
    """Assign the correct number of trues independently for each level."""
    branch = {k: {"l2": False, "l3": False, "l4": False} for k in coral_keys}

    # For each level, assign the first N keys as true.
    for i in range(min(l2, len(coral_keys))):
        branch[coral_keys[i]]["l2"] = True

    for i in range(min(l3, len(coral_keys))):
        branch[coral_keys[i]]["l3"] = True

    for i in range(min(l4, len(coral_keys))):
        branch[coral_keys[i]]["l4"] = True

    return branch


def parse_row(row):
    if row["Pre Match.match_type"] == "Practice" or row["Pre Match.match_type"] == "playoff":
        return None

    team = safe_int(row["Pre Match.teamNum"])
    match_num = safe_int(row["Pre Match.match_num"])
    match_type = "qm" if row["Pre Match.match_type"] == "Qualification" else row["Pre Match.match_type"].lower()
    alliance = "red" if "red" in row["Pre Match.allianceColor"].lower() else "blue"

    # Auto phase
    auto_branch = generate_branch_map(
        l2=safe_int(row.get("Auton.autonCoral L2")),
        l3=safe_int(row.get("Auton.autonCoral L3")),
        l4=safe_int(row.get("Auton.autonCoral L4"))
    )

    # Teleop phase
    teleop_branch = generate_branch_map(
        l2=safe_int(row.get("Match.matchCoral L2")),
        l3=safe_int(row.get("Match.matchCoral L3")),
        l4=safe_int(row.get("Match.matchCoral L4"))
    )

    auto = {
        "branchPlacement": auto_branch,
        "algaePlacement": {lane: True for lane in algae_lanes},
        "missed": {
            "l1": 0,
            "l2": 0,
            "l3": 0,
            "l4": safe_int(row.get("Auton.autonCoralMissed"))
        },
        "l1": safe_int(row.get("Auton.autonCoral L1")),
        "processor": safe_int(row.get("Auton.autonProc")),
        "barge": safe_int(row.get("Auton.autonNet")),
        "missAlgae": 0,
        "moved": str(row.get("Auton.autonLeave", "")).strip().lower() == "yes"
    }

    teleop = {
        "branchPlacement": teleop_branch,
        "algaePlacement": {lane: True for lane in algae_lanes},
        "missed": {
            "l1": 0,
            "l2": 0,
            "l3": 0,
            "l4": safe_int(row.get("Match.matchCoralMissed"))
        },
        "l1": safe_int(row.get("Match.matchCoral L1")),
        "processor": safe_int(row.get("Match.matchProc")),
        "barge": safe_int(row.get("Match.matchNet")),
        "missAlgae": 0,
        "moved": True
    }

    postmatch = {
        "skill": safe_float(row.get("Post Match.driverSkill")) / 5,
        "climbSpeed": safe_float(row.get("Post Match.robotSpeed")) / 5,
        "climbSuccess": str(row.get("Endgame.climbSuccess", "")).strip().lower() == "yes",
        "offense": str(row.get("Post Match.Defense", "")).strip().lower() == "no",
        "defense": str(row.get("Post Match.Defense", "")).strip().lower() == "yes",
        "faults": {
            "system": False,
            "idle": False,
            "other": False
        },
        "notes": str(row.get("Post Match.comments", "")).strip()
    }

    return {
        "match": match_num,
        "match_type": match_type,
        "team": team,
        "alliance": alliance,
        "status": "submitted",
        "scouter": str(row.get("scouter.name", "")).strip(),
        "last_modified": "",
        "data": {
            "auto": auto,
            "teleop": teleop,
            "postmatch": postmatch
        }
    }


# === Load CSV and convert ===
df = pd.read_csv("all_matches_quals_only.csv")
converted = [
    parsed for _, row in df.iterrows()
    if (parsed := parse_row(row)) is not None
]

# === Export JSON ===
with open("../DEMOBACKEND/converted_matches.json", "w", encoding="utf-8") as f:
    json.dump(converted, f, indent=2)
