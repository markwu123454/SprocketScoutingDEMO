import type {ScoutingData, TeamInfo} from "@/types"
import * as React from "react"
import {useEffect, useRef, useState} from "react"
import {getAuthHeaders, getScouterName, useAPI} from "@/api/API.ts"
import {usePollingEffect} from "@/contexts/pollingContext.tsx"
import {useClientEnvironment} from "@/hooks/useClientEnvironment.ts";

export default function Pre({
                                data,
                                setData,
                            }: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    const {patchData, getTeamList} = useAPI()
    const {isOnline, serverOnline} = useClientEnvironment()

    const [teamList, setTeamList] = useState<TeamInfo[] | null>(null)

    const {match, alliance, match_type, teamNumber} = data
    const scouter = getScouterName()!

    const [lastTimestamp, setLastTimestamp] = useState<string>("0")

    const inputRef = useRef<HTMLInputElement>(null);

    // 1. Debounced PATCH on input change
    useEffect(() => {
        if (!match || !alliance || teamNumber === null) return

        const timeout = setTimeout(() => {
            void patchData(match, teamNumber, match_type, {
                scouter: scouter, phase: 'pre'
            })
        }, 300)

        return () => clearTimeout(timeout)
    }, [match, alliance, teamNumber, match_type])

    // 2. Initial team list load
    useEffect(() => {
        if (!(isOnline && serverOnline) || !match || !alliance) {
            setTeamList([])
            return
        }

        let alive = true

        void (async () => {
            setTeamList(null)
            const teams = await getTeamList(match, match_type, alliance)
            console.log(teams)
            if (alive) setTeamList(teams)
        })()

        return () => {
            alive = false
        }
    }, [match, alliance, match_type, isOnline, serverOnline])


    // 3. Polling for updates
    usePollingEffect(
        match && alliance
            ? `/poll/match/${match}/${match_type}/${alliance}?client_ts=${encodeURIComponent(lastTimestamp)}`
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
        if (match && teamNumber !== null && teamNumber !== newTeamNumber) {
            const oldTeamNumber = teamNumber
            setTeamList((prev) =>
                prev?.map((t) =>
                    t.number === oldTeamNumber ? {...t, scouter: null} : t
                ) ?? null
            )
            await patchData(match, oldTeamNumber, match_type, {
                scouter: "__UNCLAIM__", phase: 'pre'
            })
        }

        setData((d) => ({
            ...d,
            teamNumber: newTeamNumber,
        }))
    }

    return (
        <div className="p-4 w-full h-full flex flex-col justify gap-2">
            <div>Pre-Match</div>

            {/* Match Type Select */}
            <div>
                <label className="block text-lg font-medium mb-1">Match Type</label>
                <div className="flex gap-2 grid-cols-3">
                    {([
                        ["qm", "Qualifications"],
                        ["sf", "Playoffs"],
                        ["f", "Finals"],
                    ] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => {
                                if ((isOnline && serverOnline) && match && teamNumber !== null) {
                                    void patchData(match, teamNumber, match_type, {
                                        scouter: "__UNCLAIM__", phase: 'pre'
                                    })
                                }

                                setData((d) => ({
                                    ...d,
                                    match_type: key,
                                    teamNumber: d.match_type === key ? d.teamNumber : null,
                                }))

                            }}
                            className={`py-1 w-[33%] h-10 rounded text-base ${
                                data.match_type === key
                                    ? "bg-zinc-400 text-white"
                                    : "bg-zinc-700 text-white"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Match Number */}
            <div>
                <label className="block text-lg font-medium mb-1">Match Number</label>
                <input
                    type="text"
                    inputMode="numeric"
                    defaultValue={match === 0 ? "" : match!}
                    ref={inputRef}
                    onChange={(e) => {
                        const raw = e.target.value.replace(/\s/g, '');
                        const newMatch = /^-?\d*\.?\d+$/.test(raw) ? parseFloat(raw) : 0;

                        if ((isOnline && serverOnline) && match && teamNumber !== null) {
                            void patchData(match, teamNumber, match_type, {
                                scouter: "__UNCLAIM__", phase: 'pre'
                            })
                        }

                        setData((d) => ({
                            ...d,
                            match: newMatch,
                            teamNumber: d.match === newMatch ? d.teamNumber : null,
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
                                if ((isOnline && serverOnline) && match && teamNumber !== null) {
                                    void patchData(match, teamNumber, match_type, {
                                        scouter: "__UNCLAIM__", phase: 'pre'
                                    })
                                }

                                setData((d) => ({
                                    ...d,
                                    alliance: color,
                                    teamNumber: d.alliance === color ? d.teamNumber : null,
                                }))

                            }}
                            className={`w-16 h-16 rounded ${alliance === color ? 'outline-2 ' : ''} ${color === 'red' ? 'bg-red-600 outline-red-300' : 'bg-blue-600 outline-blue-300'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Team Selection */}
            <div>
                <label className="block text-lg font-medium mb-1">Select Team</label>
                <div className="flex flex-col gap-2">
                    {!(isOnline && serverOnline) ? (
                        <>
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="Enter team number"
                                onChange={(e) => {
                                    const num = parseInt(e.target.value)
                                    if (!isNaN(num)) {
                                        setData((d) => ({
                                            ...d,
                                            teamNumber: num
                                        }))
                                    }
                                }}
                                className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                            />
                            <button
                                disabled
                                className="w-full py-2 rounded bg-zinc-800 opacity-50"
                            >
                                ---
                            </button>
                            <button
                                disabled
                                className="w-full py-2 rounded bg-zinc-800 opacity-50"
                            >
                                ---
                            </button>
                        </>
                    ) : (
                        (teamList === null
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

                                    <div className="text-xl flex items-center gap-1 max-w-full">
                                        <span>{team.name.nickname}</span>
                                        <span>({team.number})</span>
                                    </div>

                                    {isClaimed && (
                                        <span className="text-sm">
                                        {`Scouting by ${team.scouter === scouter ? 'you' : team.scouter}`}
                                    </span>
                                    )}
                                </button>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )

}

