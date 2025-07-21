import type {TeamInfo} from '@/types'

const url = `${window.location.protocol}//${window.location.hostname}:8000`;
const UUID_COOKIE = "scouting_uuid"
const NAME_COOKIE = "scouting_name"

// --- Cookie utilities ---
function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${value}; expires=${expires}; path=/`
}

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? match[2] : null
}

function deleteCookie(name: string) {
    document.cookie = `${name}=; Max-Age=0; path=/`
}

export function getAuthHeaders(): HeadersInit {
    const uuid = getCookie(UUID_COOKIE)
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    }
    if (uuid) headers['x-uuid'] = uuid
    return headers
}

export function getScouterName(): string | null {
    return getCookie(NAME_COOKIE)
}


// --- Hook ---
export function useScoutingSync() {
    let cachedName: string | null = null

    const getName = (): string | null => cachedName

    const patchData = async (
    match: string,
    team: number,
    updates: Record<string, any>, // TODO: replace with explicit `scouter` and `phase` params
    phase?: string
): Promise<boolean> => {
    try {
        const body: any = { updates: {} }

        if ("scouter" in updates) {
            body.updates.scouter = updates.scouter ?? "__UNCLAIM__"
        }

        const extraKeys = Object.keys(updates).filter(k => k !== "scouter")
        if (extraKeys.length > 0) {
            console.warn(`patchMetadata: Ignored unsupported keys: ${extraKeys.join(", ")}`)
        }

        if (!("scouter" in updates) && !phase) {
            console.warn("patchMetadata: called with no valid updates.")
            return false
        }

        if (phase) body.phase = phase

        const res = await fetch(`${url}/scouting/${match}/${team}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify(body),
        })

        return res.ok
    } catch (err) {
        console.error("patchMetadata failed:", err)
        return false
    }
}



    const getStatus = async (
        match: string,
        team: number
    ): Promise<any | null> => {
        try {
            const res = await fetch(`${url}/status/${match}/${team}`, {
                headers: getAuthHeaders(),
            })
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
            const res = await fetch(`${url}/match/${match}/${alliance}`, {
                headers: getAuthHeaders(),
            })
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

    const getAllStatuses = async (): Promise<Record<string, Record<number, {
            status: string;
            scouter: string | null
        }>>
        | null> => {
        try {
            const res = await fetch(`${url}/status/All/All`, {
                headers: getAuthHeaders(),
            })
            return res.ok ? await res.json() : null
        } catch (err) {
            console.error('getAllStatuses failed:', err)
            return null
        }
    }

    const login = async (passcode: string): Promise<{
        success: boolean
        name?: string
        error?: string
        permissions?: {
            dev: boolean
            admin: boolean
            match_scouting: boolean
            pit_scouting: boolean
        }
    }> => {
        deleteCookie(UUID_COOKIE)
        deleteCookie(NAME_COOKIE)

        try {
            const res = await fetch(`${url}/auth/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({passcode}),
            })

            if (!res.ok) {
                return {success: false, error: `Login failed: ${res.statusText}`}
            }

            const json = await res.json()
            setCookie(UUID_COOKIE, json.uuid, 1)
            setCookie(NAME_COOKIE, json.name, 1)
            cachedName = json.name
            return {
                success: true,
                name: json.name,
                permissions: json.permissions
            }
        } catch (err) {
            console.error("login failed:", err)
            return {success: false, error: "Network error"}
        }
    }

    const verify = async (): Promise<{
        success: boolean
        name?: string
        permissions?: {
            dev: boolean
            admin: boolean
            match_scouting: boolean
            pit_scouting: boolean
        }
    }> => {
        try {
            const res = await fetch(`${url}/auth/verify`, {
                headers: getAuthHeaders(),
            })
            if (!res.ok) return {success: false}

            const json = await res.json()
            cachedName = json.name
            return {
                success: true,
                name: json.name,
                permissions: json.permissions,
            }
        } catch {
            return {success: false}
        }
    }

    return {patchData, getStatus, getTeamList, getAllStatuses, login, verify, getName}
}

export async function unclaimTeam(match: string, team: number, alliance: string) {
    console.log("[unclaimTeam]", {match, team, alliance})
    try {
        const res = await fetch(`${url}/scouting/${match}/${team}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                updates: {
                    match,
                    alliance,
                    teamNumber: team,
                    scouter: "__UNCLAIM__",
                },
                phase: 'pre',
            }),
            keepalive: true,
        })
        return res.ok
    } catch (err) {
        console.error("unclaimTeam failed:", err)
        return false
    }
}
