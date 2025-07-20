import type {TeamInfo} from '@/types'

const url = "http://192.168.1.22:8000"

export function useScoutingSync() {
    const patchData = async (
        match: string,
        team: number,
        updates: Record<string, any>,
        phase?: string
    ): Promise<boolean> => {
        try {
            const body: any = {updates}
            if (phase) body.phase = phase
            console.log(body.phase)
            const res = await fetch(`${url}/scouting/${match}/${team}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(body),
            })
            return res.ok
        } catch (err) {
            console.error('patchData failed:', err)
            return false
        }
    }

    const getStatus = async (
        match: string,
        team: number
    ): Promise<any | null> => {
        try {
            const res = await fetch(`${url}/status/${match}/${team}`)
            return res.ok ? await res.json() : null
        } catch (err) {
            console.error('getStatus failed:', err)
            return null
        }
    }

    const getTeamList = async (
        match: string,
        alliance: 'red' | 'blue'
    ): Promise<TeamInfo[]> => {
        try {
            const res = await fetch(`${url}/match/${match}/${alliance}`)
            if (!res.ok) {
                console.warn(`getTeamList: ${res.status} ${res.statusText}`)
                return []
            }

            const json = await res.json()

            if (!json || !Array.isArray(json.teams)) {
                console.error("getTeamList: Malformed response", json)
                return []
            }

            return json.teams
        } catch (err) {
            console.error('getTeamList failed:', err)
            return []
        }
    }


    // in useScoutingSync
    const getAllStatuses = async (): Promise<Record<string, Record<number, {
        status: string;
        scouter: string | null
    }>> | null> => {
        try {
            const res = await fetch(`${url}/status/All/All`)
            return res.ok ? await res.json() : null
        } catch (err) {
            console.error('getAllStatuses failed:', err)
            return null
        }
    }


    return {patchData, getStatus, getTeamList, getAllStatuses}
}

export async function unclaimTeam(match: string, team: number, alliance: string) {
    console.log("[unclaimTeam]", { match, team, alliance })
    try {
        const res = await fetch(`${url}/scouting/${match}/${team}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                updates: {
                    match,
                    alliance,
                    teamNumber: team,
                    scouter: "__UNCLAIM__",
                },
                phase: 'pre',
            }),
            keepalive: true, // Important for unload reliability
        })
        return res.ok
    } catch (err) {
        console.error("unclaimTeam failed:", err)
        return false
    }
}
