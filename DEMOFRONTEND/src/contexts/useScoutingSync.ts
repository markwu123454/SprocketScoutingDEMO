type TeamInfo = {
    number: number
    name: string
    logo: string
}

const url = "http://127.0.0.1:8000"

export function useScoutingSync() {
    const patchData = async (
        match: string,
        team: number,
        updates: Record<string, any>,
        phase?: string
    ): Promise<boolean> => {
        try {
            const body: any = { updates }
            if (phase) body.phase = phase
            const res = await fetch(`${url}/scouting/${match}/${team}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
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
            if (!res.ok) throw new Error('Team list fetch failed')
            const json = await res.json()
            return json.teams
        } catch (err) {
            console.error('getTeamList failed:', err)
            return []
        }
    }

    const getClaimedTeams = async (
        match: string,
        teams: TeamInfo[],
        scouter: string
    ): Promise<number[]> => {
        const claimed: number[] = []
        for (const t of teams) {
            const status = await getStatus(match, t.number)
            if (status && status.scouter !== scouter && status.status !== 'unclaimed') {
                claimed.push(t.number)
            }
        }
        return claimed
    }

    return { patchData, getStatus, getTeamList, getClaimedTeams }
}
