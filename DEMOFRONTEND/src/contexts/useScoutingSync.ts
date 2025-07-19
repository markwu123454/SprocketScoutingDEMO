import type {TeamInfo} from '@/types'

const url = "http://192.168.1.127:8000"

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
            if (!res.ok) console.error('Team list fetch failed')
            const json = await res.json()
            return json.teams
        } catch (err) {
            console.error('getTeamList failed:', err)
            return []
        }
    }

    // in useScoutingSync
    const getAllStatuses = async (): Promise<Record<string, Record<number, { status: string; scouter: string | null }>> | null> => {
        try {
            const res = await fetch(`${url}/status/None/None`)
            return res.ok ? await res.json() : null
        } catch (err) {
            console.error('getAllStatuses failed:', err)
            return null
        }
    }


    return {patchData, getStatus, getTeamList, getAllStatuses}
}
