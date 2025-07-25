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
├─ public/
├─ src/
│  ├─ assets/                      # Static images, icons, etc.
│  ├─ components/
│  │  ├─ seasons/
│  │  │  └─ 2025/                  # Year-specific components (Auto, Teleop, etc.)
│  │  ├─ ui/                       # Reusable UI elements (buttons, dialogs, etc.)
│  │  └─ AuthGate.tsx             # Route protection wrapper
│  ├─ context/
│  │  └─ pollingContext.tsx       # React context for polling backend communication
│  ├─ hooks/
│  │  └─ useClientEnvironment.tsx # Hook for SSR-aware env detection
│  ├─ api/
│  │  └─ api.ts                   # All non-polling backend communication (auth, submit, fetch)
│  ├─ db/
│  │  ├─ db.ts                    # Local storage for match and pit scouting
│  │  └─ settingsDb.ts            # Dexie wrapper for Settings
│  ├─ types/
│  │  ├─ index.ts                 # Types for global use
│  ├─ utils/
│  │  └─ cn.ts                    # Tailwind class merging (clsx + twMerge)
│  ├─ pages/
│  │  ├─ Home.tsx
│  │  ├─ MatchScouting.tsx
│  │  ├─ PitScouting.tsx
│  │  ├─ MatchMonitor.tsx
│  │  ├─ Data.tsx
│  │  └─ Pre.tsx
│  ├─ main.tsx                    # React app entry point
│  ├─ App.tsx                     # Root component
│  ├─ index.css                   # Global styles
│  └─ vite-env.d.ts               # Vite’s environment declarations
└─ vite.config.ts                 # Vite project config

DEMOBACKEND/
├─ main.py                        # FastAPI entry point
├─ tba_fetcher.py                 # Blue Alliance integration
├─ logos/                         # Static/logo assets

run.py                         # use dev or prod to run whole app
```

## Development Setup

```bash
python run.py dev
```


# DOCUMENTATION

| Component        | Description                      |
|------------------|----------------------------------|
| [ScoreBox](#scorebox)         | Counter with visual pulse feedback |
| [LoadButton](#loadbutton)     | Button with loading state         |
| [InfoToggle](#infotoggle)     | Boolean toggle with tooltip       |
| [RatingSlider](#ratingslider) | Color-gradient rating slider      |
| [TooltipButton](#tooltipbutton) | Button with optional tooltip popup |


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
```

--------

## LoadButton

A reusable button component with a built-in loading indicator for submission states.

### Props

#### `loading: boolean`
If `true`, disables the button and shows a loading spinner.

#### `onClick: () => void`
Callback function to execute when the button is clicked.

#### `disabled?: boolean`  
**Default:** `false`  
Additional disabled condition. Will combine with `loading`.

#### `children: React.ReactNode`
Button content (text or elements) displayed when not loading.

---

### Example Usage

```tsx
<LoadButton
  loading={isSubmitting}
  onClick={handleSubmit}
  disabled={!formIsValid}
>
  Submit
</LoadButton>
```

--------

## InfoToggle

A toggleable boolean switch component with an optional info tooltip. Displays a label and current state ("Yes"/"No" or custom text) alongside a Help icon that reveals extra information.

---

### Props

#### `value: boolean`
Current boolean state. Determines button color and label.

#### `onToggle: () => void`
Callback function invoked when the main button is clicked.

#### `label: string`
Prefix label displayed before the current state.

#### `infoBox?: React.ReactNode`  
**Default:** `undefined`  
Optional content shown in a floating tooltip when the Help icon is clicked.

#### `trueLabel?: string`  
**Default:** `"Yes"`  
Text shown when `value` is `true`.

#### `falseLabel?: string`  
**Default:** `"No"`  
Text shown when `value` is `false`.

---

### Behavior
- Main button toggles the `value` via `onToggle`.
- If `infoBox` is provided, a small `HelpCircle` icon appears.
- Clicking the icon toggles a floating tooltip with `infoBox` content.
- Tooltip is auto-positioned and constrained within the viewport.

---

### Example Usage

```tsx
<InfoToggle
  value={data.teleop.defended}
  onToggle={() =>
    setData((d) => ({
      ...d,
      teleop: { ...d.teleop, defended: !d.teleop.defended },
    }))
  }
  label="Defended"
  infoBox={<p>Check this if the robot actively blocked opponents.</p>}
/>
```

--------


## RatingSlider

A qualitative rating slider that outputs values from `0` to `1` with a color gradient. Includes optional title, labels, and an info tooltip popup.

---

### Props

#### `value: number`
Current slider value. Must be between `0` and `1`.

#### `onChange: (val: number) => void`
Callback invoked whenever the slider is moved.

#### `title?: string`  
**Default:** `undefined`  
Optional label shown above the slider.

#### `leftLabel?: string`  
**Default:** `"Low"`  
Label below the left end of the slider.

#### `rightLabel?: string`  
**Default:** `"High"`  
Label below the right end of the slider.

#### `infoBox?: React.ReactNode`  
**Default:** `undefined`  
Optional floating info popup triggered by a Help icon.

---

### Behavior
- The slider uses a smooth gradient from red → yellow → green.
- The color updates dynamically with the value.
- Help icon toggles a popup if `infoBox` is provided.
- Values are constrained between `0` and `1` with 0.001 precision.

---

### Example Usage

```tsx
<RatingSlider
  value={data.pit.driveTrainRating}
  onChange={(val) =>
    setData(d => ({
      ...d,
      pit: { ...d.pit, driveTrainRating: val }
    }))
  }
  title="Drivetrain Quality"
  leftLabel="Unreliable"
  rightLabel="Excellent"
  infoBox={<p>Evaluate the reliability and responsiveness of the drivetrain under stress.</p>}
/>
```

--------

## TooltipButton

A full-width button with an optional floating tooltip accessible via a Help icon. Designed for use in forms or interactive UI panels where quick inline info is needed.

---

### Props

#### `label: string`
Text label shown on the button.

#### `tooltip?: React.ReactNode`  
**Default:** `undefined`  
Optional floating tooltip. Appears when clicking the Help icon in the top-right corner.

#### `onClick?: () => void`  
**Default:** `undefined`  
Callback executed when the main button body is clicked.

#### `disabled?: boolean`  
**Default:** `false`  
Disables interaction and dims the button. Also disables tooltip.

#### `className?: string`  
**Default:** `""`  
Optional Tailwind/utility class string appended to the button.

---

### Behavior

- Renders a full-width button with label and right-aligned Help icon if `tooltip` is present and `disabled` is false.
- Clicking the Help icon toggles a floating tooltip.
- Tooltip is auto-positioned within the viewport and closes when clicking anywhere else.
- Main button action (`onClick`) is separate from tooltip toggle.

---

### Example Usage

```tsx
<TooltipButton
  label="Upload CAD File"
  onClick={handleUpload}
  tooltip={<p>Accepts .sldprt, .step, or .zip archives. Max 100MB.</p>}
/>
```