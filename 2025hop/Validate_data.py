import pandas as pd

# Load the reformatted CSV
df = pd.read_csv("formatted_matches.csv")
#df = pd.read_csv("validated_matches.csv")

# Group by match number
grouped = df.groupby("Pre Match.match_num")

# Levels to validate
levels = ["L4", "L3", "L2"]

# Initialize list for cleaned entries
cleaned_rows = []

# Check each match group
for match_num, group in grouped:

    alliance_counts = group["Pre Match.allianceColor"].value_counts().to_dict()
    red_teams = group[group["Pre Match.allianceColor"] == "redAlliance"]["Pre Match.teamNum"].tolist()
    blue_teams = group[group["Pre Match.allianceColor"] == "blueAlliance"]["Pre Match.teamNum"].tolist()

    if alliance_counts.get("blueAlliance", 0) != 3 or alliance_counts.get("redAlliance", 0) != 3:
        print(f"Error: Match {match_num} has alliance imbalance: {alliance_counts}")
        print(f"\tRed Alliance teams: {red_teams}")
        print(f"\tBlue Alliance teams: {blue_teams}")

    # Check for duplicate teams
    all_teams = red_teams + blue_teams
    duplicate_teams = set([team for team in all_teams if all_teams.count(team) > 1])
    if duplicate_teams:
        print(f"Error: Match {match_num} has duplicate team(s): {sorted(duplicate_teams)}")
        print(f"\tRed Alliance teams: {red_teams}")
        print(f"\tBlue Alliance teams: {blue_teams}")

    # Remove exact duplicates of teamNum in same match
    group_deduped = []
    seen = {}
    for _, row in group.iterrows():
        team = row["Pre Match.teamNum"]
        row_data = row.drop(labels=[col for col in ["_id"] if col in row])

        if team not in seen:
            seen[team] = row_data
            group_deduped.append(row)
        else:
            existing_row = seen[team]
            if row_data.equals(existing_row):
                print(f"Removed exact duplicate for team {team} in match {match_num}")
            else:
                group_deduped.append(row)

    group_clean_df = pd.DataFrame(group_deduped)
    cleaned_rows.append(group_clean_df)

    for alliance in ["redAlliance", "blueAlliance"]:
        alliance_group = group[group["Pre Match.allianceColor"] == alliance]

        for level in levels:
            col_auton = f"Auton.autonCoral {level}"
            col_match = f"Match.matchCoral {level}"

            # Skip if either column doesn't exist
            if col_auton not in group.columns or col_match not in group.columns:
                continue

            total = alliance_group[col_auton].fillna(0).sum() + alliance_group[col_match].fillna(0).sum()
            if total > 12:
                print(f"Error: Match {match_num}, alliance {alliance}, level {level} has total {total} coral (max 12)")

# Save validated output
validated_df = pd.concat(cleaned_rows, ignore_index=True)
validated_df.to_csv("validated_matches.csv", index=False)
print("Validated CSV saved as 'validated_matches.csv'")

print("Validation complete.")