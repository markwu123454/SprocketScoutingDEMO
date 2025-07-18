import base64
import requests
from pathlib import Path
from datetime import datetime
import csv
import os
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
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


def fetch_team_logo(team_key: str, year: str) -> (Optional[str], Optional[bool]):
    url = f"{TBA_BASE_URL}/team/{team_key}/media/{year}"
    r = requests.get(url, headers=HEADERS)
    if r.status_code != 200:
        return None, None
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


def get_event_data(event_key: str) -> Dict[str, Any]:
    year: str = event_key[:4]
    matches: List[Dict[str, Any]] = fetch_event_matches(event_key)
    matches.sort(key=lambda m: (m["comp_level"], m["match_number"]))

    all_teams: set[str] = set()
    for match in matches:
        red = match["alliances"]["red"]["team_keys"]
        blue = match["alliances"]["blue"]["team_keys"]
        all_teams.update(red + blue)

    logos_downloaded: List[str] = []
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
    event_key = "2025hop"
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
    with open("team_info.csv", "w", newline='', encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "team_number", "nickname", "name", "city", "state_prov", "country"
        ])
        writer.writeheader()
        writer.writerows(team_info_list)

    print(f"Saved info for {len(team_info_list)} teams to team_info.csv")
