import pandas as pd
import numpy as np
from collections import defaultdict

# --- Load & Clean Data ---
df = pd.read_csv("all_matches.csv").fillna(0)
df.columns = df.columns.str.strip()

# Fix inconsistent team number column names
df = df.rename(columns={
    "Pre Match.teanNum": "team_num",
    "Pre Match.teamNum": "team_num",
    "Pre Match.match_num": "match_num",
    "Pre Match.allianceColor": "alliance_color"
})

# Ensure match numbers are numeric and sorted
df["match_num"] = pd.to_numeric(df["match_num"], errors="coerce")
df = df.dropna(subset=["match_num"])
df = df.sort_values("match_num")

AUTON_MISSED_PTS = 7

# --- Score Estimation Functions ---
def estimate_auton(row):
    return (
        row["Auton.autonCoral L4"] * 7 +
        row["Auton.autonCoral L3"] * 6 +
        row["Auton.autonCoral L2"] * 4 +
        row["Auton.autonCoral L1"] * 3 +
        row["Auton.autonProc"] * 2 +
        row["Auton.autonNet"] * 4
    )

def estimate_teleop(row):
    return (
        row["Match.matchCoral L4"] * 3 +
        row["Match.matchCoral L3"] * 2 +
        row["Match.matchCoral L2"] * 1 +
        row["Match.matchCoral L1"] * 1 +
        row["Match.matchProc"] * 2 +
        row["Match.matchNet"] * 4
    )

def estimate_endgame(row):
    climb_success = str(row.get("Endgame.climbSuccess", "")).strip().lower()
    climb_level = str(row.get("Endgame.Climb", "")).strip().lower()
    if climb_success == "yes":
        if "deep" in climb_level:
            return 12
        elif "shallow" in climb_level:
            return 6
    return 2  # default fail or unknown climb

# --- Add Scores to DataFrame ---
df["auton_score"] = df.apply(estimate_auton, axis=1)
df["teleop_score"] = df.apply(estimate_teleop, axis=1)
df["endgame_score"] = df.apply(estimate_endgame, axis=1)
df["estimated_points"] = df["auton_score"] + df["teleop_score"] + df["endgame_score"]

# --- Auton Reliability ---
df["Auton.ideal_score"] = (
    df["Auton.autonCoral L4"] * 7 +
    df["Auton.autonCoral L3"] * 6 +
    df["Auton.autonCoral L2"] * 4 +
    df["Auton.autonCoral L1"] * 3 +
    df["Auton.autonCoralMissed"] * AUTON_MISSED_PTS +
    df["Auton.autonProc"] * 2 +
    df["Auton.autonNet"] * 4
)
df["Auton.reliability_loss"] = df["Auton.ideal_score"] - df["auton_score"]

# --- Exponential Weighted Moving Average Helper ---
def ewma(scores, alpha=0.5):
    weights = [(1 - alpha) ** i for i in reversed(range(len(scores)))]
    return np.dot(scores, weights) / sum(weights)

# --- Initialize Team Histories ---
team_score_history = defaultdict(list)
team_auton_loss_history = defaultdict(list)
predictions = []
correct_count = 0

# --- Main Prediction Loop ---
for match_num, match_data in df.groupby("match_num"):
    red = match_data[match_data["alliance_color"] == "redAlliance"]
    blue = match_data[match_data["alliance_color"] == "blueAlliance"]

    red_teams = red["team_num"].tolist()
    blue_teams = blue["team_num"].tolist()

    if len(red_teams) != 3 or len(blue_teams) != 3:
        continue  # Skip incomplete alliances

    if all(len(team_score_history[t]) > 0 for t in red_teams + blue_teams):
        # --- Calculate Prediction Stats ---
        def team_stats(team):
            scores = team_score_history[team]
            return ewma(scores), np.std(scores) if len(scores) > 1 else 0

        red_stats = [team_stats(t) for t in red_teams]
        blue_stats = [team_stats(t) for t in blue_teams]

        red_score_pred = int(sum(s for s, _ in red_stats))
        blue_score_pred = int(sum(s for s, _ in blue_stats))

        red_std = np.mean([std for _, std in red_stats])
        blue_std = np.mean([std for _, std in blue_stats])

        red_score_actual = int(red["estimated_points"].sum())
        blue_score_actual = int(blue["estimated_points"].sum())

        # --- Confidence Heuristic ---
        red_missed = red["Auton.autonCoralMissed"].sum() + red["Match.MatchCoralMissed"].sum()
        blue_missed = blue["Auton.autonCoralMissed"].sum() + blue["Match.MatchCoralMissed"].sum()
        red_climb_fail = (red["Endgame.climbSuccess"].astype(str).str.lower() != "yes").sum()
        blue_climb_fail = (blue["Endgame.climbSuccess"].astype(str).str.lower() != "yes").sum()
        penalty = red_missed + blue_missed + red_climb_fail + blue_climb_fail

        confidence = abs(red_score_pred - blue_score_pred) / (max(red_score_pred, blue_score_pred) + 1e-5)
        confidence *= (1 - (penalty / 20))  # Reduce confidence for missed coral and climb failures

        # --- Determine Match Outcome ---
        predicted_winner = "red" if red_score_pred > blue_score_pred else "blue"
        actual_winner = "red" if red_score_actual > blue_score_actual else "blue"
        correct = predicted_winner == actual_winner
        if correct:
            correct_count += 1

        # --- Record Prediction ---
        predictions.append({
            "match_num": int(match_num),
            "red_teams": red_teams,
            "blue_teams": blue_teams,
            "pred_red_score": red_score_pred,
            "pred_blue_score": blue_score_pred,
            "actual_red_score": red_score_actual,
            "actual_blue_score": blue_score_actual,
            "error_red": abs(red_score_pred - red_score_actual),
            "error_blue": abs(blue_score_pred - blue_score_actual),
            "confidence": round(confidence, 3),
            "correct": correct
        })

    # --- Update Team Histories ---
    for _, row in match_data.iterrows():
        team = row["team_num"]
        team_score_history[team].append(row["estimated_points"])
        team_auton_loss_history[team].append(row["Auton.reliability_loss"])

# --- Output Results ---
pred_df = pd.DataFrame(predictions)
print(pred_df.to_string(index=False))
print(f"\nPrediction Accuracy: {correct_count}/{len(pred_df)} = {correct_count / len(pred_df):.2%}")



import matplotlib.pyplot as plt
import seaborn as sns

# --- Plot Setup ---
sns.set(style="whitegrid")
plt.figure(figsize=(12, 6))

# --- 1. Predicted vs Actual Scores ---
plt.subplot(1, 2, 1)
plt.scatter(pred_df["pred_red_score"], pred_df["actual_red_score"], c="red", label="Red Alliance")
plt.scatter(pred_df["pred_blue_score"], pred_df["actual_blue_score"], c="blue", label="Blue Alliance")
plt.plot([0, max(pred_df["pred_red_score"].max(), pred_df["pred_blue_score"].max())],
         [0, max(pred_df["actual_red_score"].max(), pred_df["actual_blue_score"].max())],
         color="gray", linestyle="--", label="Perfect Prediction")

plt.xlabel("Predicted Score")
plt.ylabel("Actual Score")
plt.title("Predicted vs Actual Scores")
plt.legend()

# --- 2. Confidence vs Error ---
plt.subplot(1, 2, 2)
pred_df["total_error"] = pred_df["error_red"] + pred_df["error_blue"]
sns.scatterplot(data=pred_df, x="confidence", y="total_error", hue="correct", palette={True: "green", False: "red"})

plt.xlabel("Confidence")
plt.ylabel("Total Prediction Error")
plt.title("Confidence vs Total Error")

plt.tight_layout()
plt.show()
