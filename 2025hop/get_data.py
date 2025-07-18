import requests
import json
import csv
import os

def flatten_entry(entry):
    flat = {}
    for section, values in entry.items():
        if isinstance(values, dict):
            for k, v in values.items():
                flat[f"{section}.{k}"] = v
        else:
            flat[section] = values
    return flat

headers = {
    "Authorization": "Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NzQ4NTAwMmYwNWJlMDI2N2VmNDU5ZjViNTEzNTMzYjVjNThjMTIiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiT3dmcyIsInBpY3R1cmUiOiJodHRwczovL3l0My5nZ3BodC5jb20veXRpL0FOamdRVi1oYkNJUkRVeWpDY2dacFJINmVNaFFHYjk0Si1scnM1X0k1TzZDbTAwRDNSMD1zODgtYy1rLWMweDAwZmZmZmZmLW5vLXJqIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL3NoaXQtZmFydCIsImF1ZCI6InNoaXQtZmFydCIsImF1dGhfdGltZSI6MTc1MTI5MTM4NiwidXNlcl9pZCI6IlR5enlUaU42clhOcVludmtKVkxGYndXSWZJajEiLCJzdWIiOiJUeXp5VGlONnJYTnFZbnZrSlZMRmJ3V0lmSWoxIiwiaWF0IjoxNzUxMjkxNTA4LCJleHAiOjE3NTEyOTUxMDgsImVtYWlsIjoiY2poZTA3MDVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiY2poZTA3MDVAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.NPr-UyACmySqV48lBAntev14TNdbhrQ436wumZbt4BLuJ_k_B1pE2460ldvcdYbTH_XQRuNzxVcBkP0f2I4suZeTG9DcfMxvApT46Nev4a0L28NedMPx-fZvZQEi0KsUt-JJY5fG19TbsS0txAKBTv9LN8PUZJdxZ9eCct4zg-FgmSHG_WFZQEHHvLDqFvgt5NnUQNKcrFyIu-x-6WpT6hqPeUrfuI3O8UtC3wnUhCDZVKber6UAHELPlfRY9_sIduwlTeRn-GEQRGNi9iRwgst1Yf3S8YFdS7wRBg-7s5or9PbJhh6pPr1DMaVbOx-EEH3NJWw-vEySjQP-x5wyOQ",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://sprocketstats.io",
    "Referer": "https://sprocketstats.io/",
    "User-Agent": "Mozilla/5.0"
}

all_data = []

for match_id in range(1, 126):
    url = f"https://api.sprocketstats.io/api/v2/getdata/match?matchid={match_id}"
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        data = response.json()
        if isinstance(data, list) and data:  # only add non-empty lists
            for entry in data:
                all_data.append(flatten_entry(entry))
            print(f"Downloaded match {match_id}")
        else:
            print(f"Match {match_id} has no data")
    else:
        print(f"Failed to fetch match {match_id}: {response.status_code}")

# Save to CSV if any data collected
if all_data:
    with open("all_matches.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=all_data[0].keys())
        writer.writeheader()
        writer.writerows(all_data)
else:
    print("No data collected from any match.")