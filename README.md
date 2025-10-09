# FRC Scouting Demo App

A modern web app for scouting FRC matches, built for mobile, tablets, and desktops. It features real-time syncing,
interactive match input, and TBA integration.

## Features

- Using PWA for a persistent semi-native app
- Live match syncing and local caching
- TBA API integration: match/team fetching, team logos
- Live admin control and sync across devices
- Visual scouting interface
- Modular component-based architecture (React + TypeScript)
- Minimal changes required per season
- HTTP Polling for "bidirectional" push message

### TODO:

- Push mobile notifications
- Reorder match monitoring page
- Pit scouting
- Data export and visualization
- Complete admin control
- Rethink mobile caching and sync logic

## Architecture

### Frontend

* React + Vite(TypeScript)
* Tailwind + shad/utils
* Stateless

### Backend

* Python FastAPI server
* polling requests use time.time_ns()
* non-polling requests use unix timestamp in seconds
    * inter-worker communication via SQLite
* Stateless

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
│  │  └─ utils.ts                    # Tailwind class merging (clsx + twMerge)
│  ├─ pages/
│  │  ├─ Home.tsx
│  │  ├─ MatchScouting.tsx
│  │  ├─ PitScoutingPage.tsx
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

# Project Setup Guide (Windows)

Follow this guide to set up the project on your Windows machine.

## **1. Clone the Repository**

1. Clone the repository to your local machine:

   ```bash
   git clone https://github.com/markwu123454/SprocketScoutingDEMO.git
   ```

2. Navigate to the project directory:

   ```bash
   cd SprocketScoutingDEMO
   ```

---

## **2. Install Required Software**

Ensure that the following software is installed:

### **a. Install Node.js**

1. **Download Node.js** from the official website: [Node.js Download](https://nodejs.org/).
2. Run the installer and follow the prompts to install Node.js and npm.

### **b. Install Python**

1. **Download Python 11** from the official website: [Python Download](https://www.python.org/downloads/).
2. Ensure that you check the box "Add Python to PATH" during installation.

### **c. Install PostgreSQL**

1. **Download PostgreSQL** from the official website: [PostgreSQL Download](https://www.postgresql.org/download/windows/).
2. Run the installer and follow the installation instructions.
3. During the installation, make a note of the username and password for the database.

---

## **3. Set Up PostgreSQL Database**

1. Open **pgAdmin** or **psql** (PostgreSQL command-line tool).

2. **Create a New Database** and a **New User**:

   * Open `psql` in your terminal:

     ```bash
     psql -U postgres
     ```
   * **Create Database**:

     ```sql
     CREATE DATABASE your_database_name;
     ```
   * **Create User**:

     ```sql
     CREATE USER your_username WITH PASSWORD 'your_password';
     ```
   * **Grant Permissions**:

     ```sql
     GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
     ```

---

## **4. Set Up the Project Environment**

### **a. Install Python Virtual Environment**

1. Create a virtual environment in the project directory:

   ```bash
   python -m venv .venv
   ```

2. **Activate the virtual environment**:

   * Open the command prompt or terminal and run:

     ```bash
     .venv\Scripts\activate
     ```

---

## **5. Install Project Dependencies**

1. Create a `requirements.txt` file in your project directory (if it doesn't already exist) with the following contents:

   ```txt
   fastapi
   uvicorn[gunicorn]
   asyncpg
   aiosqlite
   pydantic
   python-dotenv
   ```

2. Install the dependencies using `pip`:

   ```bash
   pip install -r requirements.txt
   ```

---

## **6. Set Up Environment Variables**

1. **Create a `.env` file** in the root of your project directory and add the following environment variables:

   ```env
   DB_USER=your_username
   DB_PASSWORD=your_password
   DB_NAME=your_database_name
   DB_HOST=localhost
   ```

2. This file will hold your database credentials and other sensitive data.

---

## **7. Update Database Connection in Code**

Ensure that the database credentials in your `db.py` are being loaded correctly from the `.env` file:

```python
from dotenv import load_dotenv
import os

load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
```

---

## **8. Run Database Migrations (If Any)**

If your project has any database migrations, run them to set up the database schema.

For this project, you can initialize the database using the `init_data_db()` function:

1. Add the following to the `main.py` file inside the `lifespan` method:

   ```python
   await db.init_data_db()
   ```

2. This will initialize the required tables in the PostgreSQL database when the app starts up.

---

## **9. Run the FastAPI Application**

1. To run the FastAPI server, use `uvicorn`. Run the following command:

   ```bash
   uvicorn main:app --reload
   ```

2. The server will start running at `http://localhost:8000`.

---

## **10. Test the API Endpoints**

1. Open a web browser or use a tool like [Postman](https://www.postman.com/) to test the API endpoints.
2. Visit `http://localhost:8000/docs` to see the interactive API documentation generated by FastAPI.

---

## **11. Optional: Run with Gunicorn for Production (Optional)**

To run FastAPI with multiple workers for production, use **Gunicorn** with `uvicorn`:

1. **Install Gunicorn**:

   ```bash
   pip install gunicorn
   ```

2. **Run the server with Gunicorn**:

   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
   ```

   This will run the app with 4 workers.

---

## **12. Clean Up**

1. **Deactivate the Virtual Environment** when you're done:

   ```bash
   deactivate
   ```

---




## Run

```bash
python run.py dev
```

# DEVELOPMENT GUIDELINES

## Backend:

### Naming:

- Global variables: `ALL_CAPS`
- Local variables: `snake_case`
- Types: `CamelCase`
- Classes: `CamelCase`
- Functions & Methods: `snake_case`

### Unit Testing:

- Use `import unittest`
- All unit tests are inlined in the file of the tested functions
- Currently unit testing only exist for direct database methods.

### Directory:

- `main.py` - FastAPI/uvicorn entry point
- `endpoints.py` - All FastAPI endpoints
- `db.py` - database methods
- `helpers.py` - Helper function for FastAPI
- `enums.py` - static type declarations
- `tba_fetcher.py` - TBA api methods
- `calculator.py` - Data processing methods
- `/calculators` - Data processing helper methods
- `/logos` - TBA fetched team logos
- `team_info.csv` - TBA fetched team nickname and name

## FRONTEND:



# DOCUMENTATION

| Component                       | Description                        |
|---------------------------------|------------------------------------|
| [ScoreBox](#scorebox)           | Counter with visual pulse feedback |
| [LoadButton](#loadbutton)       | Button with loading state          |
| [InfoToggle](#infotoggle)       | Boolean toggle with tooltip        |
| [RatingSlider](#ratingslider)   | Color-gradient rating slider       |
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

Optional callback called after each change. Includes a boolean indicating whether the change met a custom trigger
condition.

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

Optional function to determine if `onValueUpdate` should trigger the `triggered = true` flag. Useful for identifying
special behaviors (e.g. movement detection).

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
            auto: {...d.auto, l1: v}
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

A toggleable boolean switch component with an optional info tooltip. Displays a label and current state ("Yes"/"No" or
custom text) alongside a Help icon that reveals extra information.

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
            teleop: {...d.teleop, defended: !d.teleop.defended},
        }))
    }
    label="Defended"
    infoBox={<p>Check this if the robot actively blocked opponents.</p>}
/>
```

--------

## RatingSlider

A qualitative rating slider that outputs values from `0` to `1` with a color gradient. Includes optional title, labels,
and an info tooltip popup.

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
            pit: {...d.pit, driveTrainRating: val}
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

A full-width button with an optional floating tooltip accessible via a Help icon. Designed for use in forms or
interactive UI panels where quick inline info is needed.

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