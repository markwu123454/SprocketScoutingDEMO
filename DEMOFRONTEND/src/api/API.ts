import type {TeamInfo, ScoutingData, MatchType, AllianceType} from '@/types'

const BASE_URL = `${window.location.protocol}//${window.location.hostname}:8000`;
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
export function useAPI() {
    let cachedName: string | null = null

    type SubmitPayload = {
        match_type: MatchType;
        alliance: AllianceType;
        scouter: string;
        data: Omit<ScoutingData,
            'match' |
            'alliance' |
            'teamNumber' |
            'scouter'
        >;
    }


    const getCachedName = (): string | null => cachedName


    const submitData = async (
        match: number,
        team: number,
        fullData: SubmitPayload
    ): Promise<boolean> => {
        try {
            const {match_type, alliance, scouter, data} = fullData;
            console.log(data)
            // flatten into the exact shape your POST endpoint expects
            const body = {
                match_type,
                alliance,
                scouter,
                ...data,
            };

            const res = await fetch(`${BASE_URL}/scouting/${match}/${team}/submit`, {
                method: 'POST',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            return res.ok;
        } catch (err) {
            console.error('submitData failed:', err);
            return false;
        }
    };


    const patchData = async (
        match: number,
        team: number,
        match_type: MatchType,
        updates: { scouter?: string | null; phase?: string }
    ): Promise<boolean> => {
        try {
            const scouter = updates.scouter ?? "__UNCLAIM__";
            const phase = updates.phase;

            if (!updates.scouter && !phase) {
                console.warn("patchData: called with no valid updates.");
                return false;
            }

            const query = new URLSearchParams();
            query.set("scouter", scouter);
            if (phase) query.set("status", phase);

            const res = await fetch(`${BASE_URL}/scouting/${match_type}/${match}/${team}/state?${query.toString()}`, {
                method: "PATCH",
                headers: getAuthHeaders(),
            });

            return res.ok;
        } catch (err) {
            console.error("patchData failed:", err);
            return false;
        }
    };


    const updateMatchData = async (
        match: number,
        team: number,
        match_type: MatchType,
        scouter: string,
        data: Partial<ScoutingData>
    ): Promise<boolean> => {
        try {
            const res = await fetch(
                `${BASE_URL}/scouting/${match_type}/${match}/${team}/${encodeURIComponent(scouter)}`,
                {
                    method: "PATCH",
                    headers: {
                        ...getAuthHeaders(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data),
                }
            );

            return res.ok;
        } catch (err) {
            console.error("updateMatchData failed:", err);
            return false;
        }
    };


    const getCurrentScoutingEntry = async (): Promise<any | null> => {
        try {
            const res = await fetch(`${BASE_URL}/scouting/current`, {
                headers: getAuthHeaders(),
            })
            return res.ok ? await res.json() : null
        } catch (err) {
            console.error("getCurrentScoutingEntry failed:", err)
            return null
        }
    }


    const getStatus = async (
        match: string,
        team: number
    ): Promise<any | null> => {
        try {
            const res = await fetch(`${BASE_URL}/status/${match}/${team}`, {
                headers: getAuthHeaders(),
            })
            return res.ok ? await res.json() : null
        } catch (err) {
            console.error('getStatus failed:', err)
            return null
        }
    }


    const getTeamList = async (
        match: number,
        m_type: MatchType,
        alliance: 'red' | 'blue'
    ): Promise<TeamInfo[]> => {
        try {
            const res = await fetch(`${BASE_URL}/match/${match}/${alliance}/${m_type}`, {
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
            const res = await fetch(`${BASE_URL}/status/All/All`, {
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
    }> =>
    {
        deleteCookie(UUID_COOKIE)
        deleteCookie(NAME_COOKIE)

        try {
            const res = await fetch(`${BASE_URL}/auth/login`, {
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
    }> =>
    {
        try {
            const res = await fetch(`${BASE_URL}/auth/verify`, {
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

    const ping = async (): Promise<boolean> => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        try {
            const res = await fetch(`${BASE_URL}/ping`, {
                method: "GET",
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (!res.ok) return false;

            const data = await res.json();
            return data.ping === "pong";
        } catch {
            return false;
        }
    };


    return {
        patchData,
        updateMatchData,
        submitData,
        getStatus,
        getTeamList,
        getAllStatuses,
        getCachedName,
        getCurrentScoutingEntry,

        login,
        verify,
        ping
    }
}