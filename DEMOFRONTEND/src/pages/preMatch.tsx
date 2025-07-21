import type {ScoutingData, TeamInfo} from "@/types.ts"
import * as React from "react"
import {getAuthHeaders, getScouterName, useScoutingSync} from "@/contexts/useScoutingSync.ts"
import {useEffect, useState} from "react"
import {usePollingEffect} from "@/contexts/pollingContext.tsx"

export default function PreMatch({
                                     data,
                                     setData,
                                 }: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    const {patchData, getTeamList} = useScoutingSync()
    const [teamList, setTeamList] = useState<TeamInfo[] | null>(null)
    const [showCustomTeam, setShowCustomTeam] = useState(false)

    const {match, alliance, teamNumber} = data
    const scouter = getScouterName() || ""
    const isValidMatch = (m: string) => /^\d+$/.test(m)

    const [lastTimestamp, setLastTimestamp] = useState<string>("")

    // 1. Debounced PATCH on input change
    useEffect(() => {
        if (!match || !alliance || teamNumber === null) return

        const timeout = setTimeout(() => {
            void patchData(match, teamNumber, {match, alliance, teamNumber, scouter}, "pre")
        }, 300)

        return () => clearTimeout(timeout)
    }, [match, alliance, teamNumber])

    // 2. Initial team list load
    useEffect(() => {
        if (!isValidMatch(match) || !alliance) {
            setTeamList([])
            return
        }

        let alive = true
        void (async () => {
            setTeamList(null)
            const teams = await getTeamList(match, alliance)
            if (alive) setTeamList(teams)
        })()

        return () => {
            alive = false
        }
    }, [match, alliance])

    // 3. Polling for updates
    usePollingEffect(
        isValidMatch(match) && alliance
            ? `${window.location.protocol}//${window.location.hostname}:8000/poll/match/${match}/${alliance}?client_ts=${encodeURIComponent(lastTimestamp)}`
            : null,
        (data: { teams: Record<string, { scouter: string | null }>, timestamp?: string }) => {
            // Update team list
            setTeamList((prev) =>
                !prev
                    ? prev
                    : prev.map((t) =>
                        t.number in data.teams
                            ? {...t, scouter: data.teams[t.number].scouter}
                            : t
                    )
            )

            // Store new timestamp
            if (data.timestamp) setLastTimestamp(data.timestamp)
        },
        [match, alliance, lastTimestamp],
        300,
        getAuthHeaders()
    )


    const handleTeamSelect = async (newTeamNumber: number) => {
        setShowCustomTeam(false)
        if (match && teamNumber !== null && teamNumber !== newTeamNumber) {
            const oldTeamNumber = teamNumber
            setTeamList((prev) =>
                prev?.map((t) =>
                    t.number === oldTeamNumber ? {...t, scouter: null} : t
                ) ?? null
            )
            await patchData(match, oldTeamNumber, {
                match,
                alliance,
                teamNumber: oldTeamNumber,
                scouter: "__UNCLAIM__",
            }, 'pre')
        }

        setData((d) => ({
            ...d,
            teamNumber: newTeamNumber,
        }))
    }

    return (
        <div className="p-4 w-full h-full flex flex-col justify gap-2">
            <div>Pre-Match</div>

            {/* Match Number */}
            <div>
                <label className="block text-lg font-medium mb-1">Match Number</label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={match}
                    onChange={(e) => {
                        const newMatch = e.target.value
                        if (match && teamNumber !== null) {
                            const oldTeamNumber = teamNumber
                            void patchData(match, oldTeamNumber, {
                                match,
                                alliance,
                                teamNumber: oldTeamNumber,
                                scouter: "__UNCLAIM__",
                            }, 'pre')
                        }

                        setData((d) => ({
                            ...d,
                            match: newMatch,
                            teamNumber: null,
                        }))
                    }}
                    className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                />
            </div>

            {/* Alliance Selection */}
            <div>
                <label className="block text-lg font-medium mb-1">Select Alliance</label>
                <div className="flex gap-4">
                    {(['red', 'blue'] as const).map((color) => (
                        <button
                            key={color}
                            onClick={() => {
                                if (match && teamNumber !== null) {
                                    const oldTeamNumber = teamNumber
                                    void patchData(match, oldTeamNumber, {
                                        match,
                                        alliance,
                                        teamNumber: oldTeamNumber,
                                        scouter: "__UNCLAIM__",
                                    }, 'pre')
                                }

                                setData((d) => ({
                                    ...d,
                                    alliance: color,
                                    teamNumber: null,
                                }))
                            }}
                            className={`w-16 h-16 rounded ${alliance === color ? 'outline-2 outline-white' : ''} ${color === 'red' ? 'bg-red-600' : 'bg-blue-600'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Team Selection */}
            <div>
                <label className="block text-lg font-medium mb-1">Select Team</label>
                <div className="flex flex-col gap-2">
                    {(teamList === null
                            ? Array(3).fill(null)
                            : teamList.length > 0
                                ? teamList
                                : Array(3).fill(undefined)
                    ).map((team, i) => {
                        if (!team) {
                            return (
                                <button
                                    key={i}
                                    disabled
                                    className="w-full py-2 rounded bg-zinc-800 opacity-50"
                                >
                                    ---
                                </button>
                            )
                        }

                        const isSelected = teamNumber === team.number
                        const isClaimed = team.scouter !== null && team.number !== teamNumber

                        return (
                            <button
                                key={team.number}
                                disabled={isClaimed}
                                onClick={() => handleTeamSelect(team.number)}
                                className={`w-full py-2 px-4 rounded flex items-center justify-center gap-3 ${isSelected ? 'bg-zinc-500' : 'bg-zinc-700'} ${isClaimed ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <div
                                    className={`w-10 h-10 rounded flex items-center justify-center ${
                                        alliance === 'red' ? 'bg-red-700' : alliance === 'blue' ? 'bg-blue-700' : 'bg-zinc-600'
                                    }`}
                                >
                                    <img
                                        src={team.logo}
                                        alt={team.name}
                                        className="w-8 h-8 rounded"
                                    />
                                </div>

                                <span className='text-xl'>{`${team.name.nickname}(${team.number})`}</span>
                                {isClaimed && (
                                    <span className="text-sm">
                                        {`Scouting by ${team.scouter === scouter ? 'you' : team.scouter}`}
                                    </span>
                                )}
                            </button>
                        )
                    })}

                    {!showCustomTeam ? (
                        <button
                            className="text-left text-sm text-zinc-400 underline mt-1"
                            onClick={() => {
                                if (match && teamNumber !== null) {
                                    const oldTeamNumber = teamNumber
                                    void patchData(match, oldTeamNumber, {
                                        match,
                                        alliance,
                                        teamNumber: oldTeamNumber,
                                        scouter: "__UNCLAIM__",
                                    }, 'pre')
                                }

                                setShowCustomTeam(true)
                                setData((d) => ({
                                    ...d,
                                    teamNumber: null,
                                }))
                            }}
                        >
                            If your team isn’t listed, enter it manually
                        </button>
                    ) : (
                        <input
                            type="text"
                            placeholder="Custom team number"
                            value={teamNumber?.toString() ?? ''}
                            onChange={(e) => {
                                const num = parseInt(e.target.value || '0')
                                setData((d) => ({
                                    ...d,
                                    teamNumber: num || null,
                                }))
                            }}
                            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

