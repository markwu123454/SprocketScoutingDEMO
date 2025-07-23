// src/lib/db.ts
import Dexie, {type Table } from 'dexie'
import type { ScoutingData } from '@/types'

interface ScoutingDataWithKey extends ScoutingData {
    key: string
}

class ScoutingAppDB extends Dexie {
    scouting!: Table<ScoutingDataWithKey, string> // key is string

    constructor() {
        super('ScoutingAppDB')
        this.version(1).stores({
            scouting: 'key,match,teamNumber'
        })
    }
}

export const db = new ScoutingAppDB()

export async function saveScoutingData(data: ScoutingData) {
    const { match, match_type, teamNumber } = data

    if (!match || !match_type || !teamNumber) {
        throw new Error('match, match_type, and teamNumber must be set to generate a key')
    }

    const key = `${match_type}|${match}|${teamNumber}`

    const entry: ScoutingDataWithKey = { ...data, key }
    await db.scouting.put(entry)
}

export async function getScoutingData(match_type: string, match: string, teamNumber: number) {
    const key = `${match_type}|${match}|${teamNumber}`
    return await db.scouting.get(key)
}

export async function getAllScoutingKeys(): Promise<string[]> {
    return await db.scouting.toCollection().primaryKeys()
}

export async function deleteScoutingData(key: string): Promise<void> {
    await db.scouting.delete(key)
}
