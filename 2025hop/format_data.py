import csv
import pandas as pd

# Load the raw CSV
raw_df = pd.read_csv("all_matches.csv")

# Rename incorrect columns
raw_df = raw_df.rename(columns={"Pre Match.teanNum": "Pre Match.teamNum"})

# Only keep relevant scoring columns for reformatting
columns_to_extract = [
    "Pre Match.match_num",
    "Pre Match.teamNum",
    "Pre Match.allianceColor",
    "Auton.autonCoral L4", "Auton.autonCoral L3", "Auton.autonCoral L2", "Auton.autonCoral L1",
    "Auton.autonCoralMissed", "Auton.autonProc", "Auton.autonNet",
    "Match.matchCoral L4", "Match.matchCoral L3", "Match.matchCoral L2", "Match.matchCoral L1",
    "Match.MatchCoralMissed", "Match.matchProc", "Match.matchNet"
]

clean_df = raw_df[columns_to_extract].copy()

columns_present = [col for col in columns_to_extract if col in raw_df.columns]
missing_columns = [col for col in columns_to_extract if col not in raw_df.columns]
if missing_columns:
    print("Missing columns:", missing_columns)

# Standardize missing values as 0 and types as integers where applicable
for col in clean_df.columns:
    if col != "Pre Match.allianceColor":
        try:
            if isinstance(clean_df[col], pd.Series):
                clean_df[col] = pd.to_numeric(clean_df[col], errors="coerce").fillna(0).astype(int)
            else:
                print(f"Skipping column {col}: not a Series")
        except Exception as e:
            print(f"Failed to process column: {col} ({e})")
            print("Offending content:\n", clean_df[col].head())


# Save the reformatted data to new CSV
clean_df.to_csv("formatted_matches.csv", index=False)

print("Reformatted CSV saved as 'formatted_matches.csv'")
