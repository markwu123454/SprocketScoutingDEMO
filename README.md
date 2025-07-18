# FRC Scouting Demo App

A modern web app for scouting FRC matches, built for both tablets and desktops. It features real-time syncing,
interactive match input, and TBA integration.

## Features

- Mobile and desktop compatible (no scrolling required on mobile)
- Full match phase flow: Pre-match → Auto → Teleop → Post-match
- TBA API integration: match/team fetching, team logos
- Live admin control and data sync across devices
- Visual UI with phase transitions and interactive controls
- Modular component-based architecture (React + TypeScript)

Planned features:

- 🔔 Live mobile notifications
- 📅 Match schedule auto-matching and validation

## Tech Stack

| Frontend     | Backend          | Misc                     |
|--------------|------------------|--------------------------|
| React + Vite | FastAPI (Python) | Tailwind CSS + shadcn/ui |
| TypeScript   | TBA API v3       | REST + JSON              |

## Directory Structure

```
DEMOFRONTEND/
├─ src/
│ ├─ components/
│ ├─ pages/
│ ├─ context/
│ └─ App.tsx
└─ vite.config.ts

DEMOBACKEND/
├─ main.py
├─ tba_fetcher.py
├─ logos/
```

## Development Setup

```bash
python run.py
