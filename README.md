# FRC Scouting Demo App

A modern web app for scouting FRC matches, built for mobile, tablets, and desktops. It features real-time syncing,
interactive match input, and TBA integration.

## Features

- Mobile and desktop compatible (no scrolling required on mobile)
- Full match phase flow: Pre-match → Auto → Teleop → Endgame + Post-match
- Manual/automatic authorization per match
- TBA API integration: match/team fetching, team logos
- Live admin control and sync across devices
- Visual UI with phase transitions and interactive controls
- Modular component-based architecture (React + TypeScript)
- Only front end changes necessary to be used every season

Planned features:

- Live mobile notifications
- Match schedule auto-matching and validation
- Pit scouting
- Data export and visualization
- Complete admin control
- Integration with websocket for low latency communications

## Architecture

### Frontend
* React + Vite(TypeScript)
* Tailwind + shad/cn
* Stateless 

### Backend
* Python FastAPI server
* Stateful

### Communication
* HTTP Client-Server communication

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

run.py
```

## Development Setup

```bash
python run.py
