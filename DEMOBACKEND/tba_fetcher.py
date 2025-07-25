import base64
import re

import requests
from pathlib import Path
from datetime import datetime
import csv
import os
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from functools import lru_cache

load_dotenv()

TBA_BASE_URL: str = "https://www.thebluealliance.com/api/v3"
AUTH_KEY = os.getenv("TBA_KEY", None)
HEADERS: Dict[str, str] = {"X-TBA-Auth-Key": AUTH_KEY}
LOGO_DIR = Path("./logos")
DEFAULT_YEAR = "2025"


def fetch_event_matches(event_key: str) -> List[Dict[str, Any]]:
    url = f"{TBA_BASE_URL}/event/{event_key}/matches"
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    return r.json()


def resolve_team_logo(team_number: int, year: str = DEFAULT_YEAR) -> str:
    team_key = f"frc{team_number}"
    local_path = LOGO_DIR / f"{team_key}.png"

    if local_path.exists():
        with open(local_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")
        return f"data:image/png;base64,{encoded}"

    logo_url, is_base64 = fetch_team_logo(team_key, year)
    if logo_url is None:
        return "/assets/logos/default.png"  # fallback to file path

    save_logo(team_key, logo_url, is_base64)

    # Read saved image as base64 after caching
    with open(local_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


@lru_cache(maxsize=512)
def resolve_team_logo_cached(team_number: int, year: str = DEFAULT_YEAR) -> str:
    return resolve_team_logo(team_number, year)


def fetch_team_logo(team_key: str, year: str, max_years_back: int = 10) -> (Optional[str], Optional[bool]):
    year_int = int(year)
    for y in range(year_int, year_int - max_years_back - 1, -1):
        url = f"{TBA_BASE_URL}/team/{team_key}/media/{y}"
        r = requests.get(url, headers=HEADERS)
        if r.status_code != 200:
            continue
        media: List[Dict[str, Any]] = r.json()
        for item in media:
            if item.get("type") == "avatar" and "base64Image" in item.get("details", {}):
                return item["details"]["base64Image"], True
            elif item.get("type") == "avatar" and "direct_url" in item:
                return item["direct_url"], False
    return None, None


def save_logo(team_key: str, data: str, is_base64: bool) -> None:
    LOGO_DIR.mkdir(exist_ok=True)
    path: Path = LOGO_DIR / f"{team_key}.png"
    if is_base64:
        with open(path, "wb") as f:
            f.write(base64.b64decode(data))
    else:
        r = requests.get(data)
        if r.status_code == 200:
            with open(path, "wb") as f:
                f.write(r.content)


def fetch_team_name(team_key: str) -> Dict[str, Optional[str]]:
    url = f"{TBA_BASE_URL}/team/{team_key}"
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    team_info: Dict[str, Any] = r.json()
    return {
        "team_number": team_info.get("team_number"),
        "nickname": team_info.get("nickname"),
        "name": team_info.get("name"),
        "city": team_info.get("city"),
        "state_prov": team_info.get("state_prov"),
        "country": team_info.get("country")
    }


@lru_cache(maxsize=512)
def fetch_team_name_cached(team_key: str) -> dict:
    return fetch_team_name(team_key)


_cached_matches: Dict[str, Dict[int, Dict[str, list[str]]]] = {}


def load_event_data(event_key: str):
    event_csv = Path(f"{event_key}.csv")
    if not event_csv.exists():
        raise FileNotFoundError(f"CSV file for event '{event_key}' not found.")

    matches: Dict[str, Dict[int, Dict[str, list[str]]]] = {}
    with open(event_csv, newline='', encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            comp_level = row["comp_level"]
            match_num = int(row["match_number"])
            red = [t[3:] if t.startswith("frc") else t for t in row["red"].split(",")]
            blue = [t[3:] if t.startswith("frc") else t for t in row["blue"].split(",")]

            if comp_level not in matches:
                matches[comp_level] = {}
            matches[comp_level][match_num] = {"red": red, "blue": blue}
    return matches


def get_match_alliance_teams(event_key: str, match_type: str, match_number: int, alliance: str) -> list[str]:
    if not _cached_matches:
        _cached_matches.update(load_event_data(event_key))

    if alliance not in ("red", "blue"):
        raise ValueError("Alliance must be 'red' or 'blue'")

    if match_type not in _cached_matches or match_number not in _cached_matches[match_type]:
        raise ValueError(f"Match {match_type}{match_number} not found")

    return _cached_matches[match_type][match_number][alliance]


@lru_cache(maxsize=512)
def get_match_alliance_teams_cached(event_key: str, match_type: str, match_number: int, alliance: str) -> list[str]:
    return get_match_alliance_teams(event_key, match_type, match_number, alliance)


def get_event_data(event_key: str) -> Dict[str, Any]:
    year = event_key[:4]
    event_csv = Path(f"{event_key}.csv")
    matches: List[Dict[str, Any]] = []
    logos_downloaded: List[str] = []
    all_teams: set[str] = set()

    # If CSV exists, load from it
    if event_csv.exists():
        with open(event_csv, newline='', encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                match = {
                    "comp_level": row["comp_level"],
                    "match_number": row["match_number"],
                    "red": row["red"].split(","),
                    "blue": row["blue"].split(","),
                    "timestamp": float(row["timestamp"])
                }
                matches.append({
                    "comp_level": match["comp_level"],
                    "match_number": match["match_number"],
                    "alliances": {
                        "red": {"team_keys": match["red"]},
                        "blue": {"team_keys": match["blue"]},
                    },
                    "actual_time": match["timestamp"]
                })
                all_teams.update(match["red"] + match["blue"])
    else:
        # Fetch from TBA
        matches_raw = fetch_event_matches(event_key)
        for match in matches_raw:
            match["match_number"] = int(re.search(r"_(?:sf|qm)(\d+)", match["key"]).group(1)) \
                if "_sf" in match["key"] or "_qm" in match["key"] \
                else int(re.search(r"m(\d+)$", match["key"]).group(1))

        matches_raw.sort(key=lambda m: (m["comp_level"], m["match_number"]))

        with open(event_csv, "w", newline='', encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["comp_level", "match_number", "red", "blue", "timestamp"])
            writer.writeheader()

            for m in matches_raw:
                red = m["alliances"]["red"]["team_keys"]
                blue = m["alliances"]["blue"]["team_keys"]
                timestamp = m.get("actual_time") or m.get("predicted_time") or m.get("time") or 0

                writer.writerow({
                    "comp_level": m["comp_level"],
                    "match_number": m["match_number"],
                    "red": ",".join(red),
                    "blue": ",".join(blue),
                    "timestamp": timestamp,
                })

                matches.append({
                    "comp_level": m["comp_level"],
                    "match_number": m["match_number"],
                    "alliances": {
                        "red": {"team_keys": red},
                        "blue": {"team_keys": blue},
                    },
                    "actual_time": timestamp
                })
                all_teams.update(red + blue)

    # Cache team logos
    for team_key in sorted(all_teams):
        logo_data, is_base64 = fetch_team_logo(team_key, year)
        if logo_data:
            if is_base64:
                logo_data = logo_data.split(",", 1)[-1]
            save_logo(team_key, logo_data, is_base64)
            logos_downloaded.append(team_key)

    return {
        "matches": matches,
        "logos_downloaded": logos_downloaded
    }


if __name__ == "__main__":
    event_key = "2025caoc"
    year = event_key[:4]
    data = get_event_data(event_key)
    print("Match details loaded")
    matches = data["matches"]
    logos_downloaded = data["logos_downloaded"]

    print(f"Downloaded {len(logos_downloaded)} logos.")
    print("Match summary:")
    for m in matches:
        t = m.get("actual_time") or m.get("predicted_time") or m.get("time")
        if t: t = datetime.fromtimestamp(t).isoformat()
        red = " / ".join(m["alliances"]["red"]["team_keys"])
        blue = " / ".join(m["alliances"]["blue"]["team_keys"])
        print(f"{m['comp_level'].upper()} {m['match_number']:>2}: {red} vs {blue} @ {t}")

    # Save team metadata
    team_info_list = []
    for team_key in sorted(set(logos_downloaded)):
        info = fetch_team_name(team_key)
        team_info_list.append(info)

    # Write to CSV
    file_exists = os.path.exists("team_info.csv")
    with open("team_info.csv", "a", newline='', encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "team_number", "nickname", "name", "city", "state_prov", "country"
        ])
        if not file_exists:
            writer.writeheader()
        writer.writerows(team_info_list)

    print(f"Saved info for {len(team_info_list)} teams to team_info.csv")
