import Dexie, {type Table} from "dexie"

// 1. Typed settings object
export type Settings = {
    theme?: "dark" | "light" | "2025" | "2026"
    field_orientation?: "0" | "90" | "180" | "270"
    [key: string]: string | boolean | number | undefined
}

export interface SettingRow {
    key: "global"
    value: Settings
}

class SettingsDB extends Dexie {
    settings!: Table<SettingRow, string>
    constructor() {
        super("SettingsDB")
        this.version(1).stores({
            settings: "&key"
        })
    }
}

export const settingsDB = new SettingsDB()

// 2. Get full settings object or specific key
export async function getSetting<K extends keyof Settings>(
    key?: K
): Promise<Settings[K] | Settings | null> {
    const entry = await settingsDB.settings.get("global")
    if (!entry) return null
    return key ? entry.value[key] ?? null : entry.value
}

// 3. Set partial or full settings
export async function setSetting(patch: Partial<Settings>) {
    const current = (await settingsDB.settings.get("global"))?.value ?? {}
    const updated = {...current, ...patch}
    await settingsDB.settings.put({key: "global", value: updated})
}
