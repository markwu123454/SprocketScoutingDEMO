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

## FlowCharts:

![Diagram](https://lucid.app/publicSegments/view/1887b93a-9819-4fe0-822c-1f8e0046f64b/image.png)

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
```


# DOCUMENTATION

--------

## ScoreBox

A customizable score tracking widget for UI interaction.

### Props

#### `id: string`
Unique identifier for the component.

#### `label: string`
Text label shown before the current value (e.g., `"L1 ▷ 3"`).

#### `value: number`
Current value displayed and controlled by the component.

#### `onChange: (newValue: number) => void`
Required callback to handle value updates externally.

#### `onValueUpdate?: (newValue: number, triggered: boolean) => void`
Optional callback called after each change. Includes a boolean indicating whether the change met a custom trigger condition.

#### `step?: number`  
**Default:** `1`  
Amount to increment or decrement per click.

#### `min?: number`  
**Default:** `0`  
Minimum allowed value. Values below this are clamped.

#### `max?: number`  
**Default:** `Infinity`  
Maximum allowed value. Values above this are clamped.

#### `showPulse?: boolean`  
**Default:** `true`  
Whether to briefly flash the background color on value change.

#### `pulseDuration?: number`  
**Default:** `150` (milliseconds)  
Duration of the pulse effect.

#### `upColor?: string`  
**Default:** `bg-green-700`  
Tailwind class used for background when incrementing.

#### `downColor?: string`  
**Default:** `bg-red-700`  
Tailwind class used for background when decrementing.

#### `baseColor?: string`  
**Default:** `bg-zinc-800`  
Tailwind class used for background when idle.

#### `triggerPulseCondition?: (label: string, delta: number) => boolean`
Optional function to determine if `onValueUpdate` should trigger the `triggered = true` flag. Useful for identifying special behaviors (e.g. movement detection).

---

### Example Usage

```tsx
<ScoreBox
  id="auto-l1"
  label="L1"
  value={data.auto.l1}
  onChange={(v) =>
    setData(d => ({
      ...d,
      auto: { ...d.auto, l1: v }
    }))
  }
  onValueUpdate={(v, move) =>
    patchData("auto", "l1", v)
  }
/>