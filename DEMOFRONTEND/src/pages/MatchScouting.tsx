import {useState, useEffect, useRef} from 'react'
import {useScoutingSync} from '@/contexts/useScoutingSync'
import {Button} from '@/components/ui/button'
import type {ScoutingData, Phase, TeamInfo} from '@/types'
import AutoPhase from "@/components/2025/auto.tsx";
import TeleopPhase from "@/components/2025/teleop.tsx";
import PostMatch from "@/components/2025/post.tsx";
import * as React from "react";

const initialScoutingData: ScoutingData = {
    match: '',
    alliance: null,
    teamNumber: null,

    auto: {
        branchPlacement: {
            A: {l2: false, l3: false, l4: false},
            B: {l2: false, l3: false, l4: false},
            C: {l2: false, l3: false, l4: false},
            D: {l2: false, l3: false, l4: false},
            E: {l2: false, l3: false, l4: false},
            F: {l2: false, l3: false, l4: false},
            G: {l2: false, l3: false, l4: false},
            H: {l2: false, l3: false, l4: false},
            I: {l2: false, l3: false, l4: false},
            J: {l2: false, l3: false, l4: false},
            K: {l2: false, l3: false, l4: false},
            L: {l2: false, l3: false, l4: false},
        },
        missed: {
            l1: 0,
            l2: 0,
            l3: 0,
            l4: 0,
        },
        l1: 0,
        reef: 0,
        barge: 0,
        moved: false,
    },

    teleop: {
        l1: 0,
        l2: 0,
        l3: 0,
        l4: 0,
        coralMissed: 0,
        reef: 0,
        barge: 0,
        algaeMissed: 0,
    },

    endgame: {
        climb: 'none',
        success: false,
    },

    postmatch: {
        intake: 'none',
    }
}

const PHASE_ORDER: Phase[] = ['pre', 'auto', 'teleop', 'post']

const SCOUTER = `DEMO${Math.floor(Math.random() * 10)}`

export default function MatchScoutingLayout() {
    const [phaseIndex, setPhaseIndex] = useState(0)
    const phase = PHASE_ORDER[phaseIndex]
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [scoutingData, setScoutingData] = useState<ScoutingData>(initialScoutingData)

    const {patchData} = useScoutingSync()

    const handleSubmit = async () => {
        /*
        setIsSubmitting(true)
        try {
            const res = await fetch("/api/scouting", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(formData),
            })

            if (!res.ok) throw new Error("Failed to submit")

            // success → reset state
            setFormData(initialScoutingData)
            setPhaseIndex(0) // go back to pre-match
        } catch (err) {
            console.error(err)
            // Optional: show error toast
        } finally {
            setIsSubmitting(false)
        }
         */
        setIsSubmitting(true)
        await patchData(scoutingData.match, scoutingData.teamNumber!, {}, 'submitted')
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setScoutingData(initialScoutingData)
        setPhaseIndex(0) // go back to pre-match
        setIsSubmitting(false)
    }

    const handleNext = async () => {
        const nextIndex = phaseIndex + 1
        setPhaseIndex(nextIndex)
        await patchData(scoutingData.match, scoutingData.teamNumber!, {}, PHASE_ORDER[nextIndex])
    }

    const handleBack = async () => {
        if (phaseIndex > 0) {
            const prevIndex = phaseIndex - 1
            setPhaseIndex(prevIndex)
            await patchData(scoutingData.match, scoutingData.teamNumber!, {}, PHASE_ORDER[prevIndex])
        } else {
            console.log("can't back")
            await patchData(scoutingData.match, scoutingData.teamNumber!, {}, PHASE_ORDER[phaseIndex])
        }
    }


    return (
        <div className="w-screen min-h-[100dvh] flex flex-col bg-zinc-900 text-white overflow-hidden touch-none">
            {/* Top Bar */}
            <div className="flex justify-between items-center p-4 bg-zinc-800 text-ml font-semibold">
                <div>
                    {SCOUTER}
                </div>
                <div>
                    {scoutingData.teamNumber !== null
                        ? `Team ${scoutingData.teamNumber}`
                        : 'Team –'}
                </div>
                <div>
                    Match #{scoutingData.match || '–'} (
                    {scoutingData.alliance?.toUpperCase() || '–'})
                </div>
                <div className="capitalize">{phase}</div>
            </div>

            {/* Main Phase Content */}
            <div className="flex-1 flex items-center justify-center text-4xl">
                {phase === 'pre' && <PreMatch data={scoutingData}
                                              setData={setScoutingData}/>}
                {phase === 'auto' && <AutoPhase data={scoutingData}
                                                setData={setScoutingData}/>}
                {phase === 'teleop' && <TeleopPhase data={scoutingData}
                                                    setData={setScoutingData}/>}
                {phase === 'post' && <PostMatch data={scoutingData}
                                                setData={setScoutingData}/>}
            </div>

            {/* Bottom Right Action */}
            <div className="flex justify-between items-center p-4 bg-zinc-800 text-xl font-semibold">

                <Button onClick={handleBack} disabled={isSubmitting || phaseIndex < 1}>
                    Back
                </Button>
                <Button onClick={phase === "post" ? handleSubmit : handleNext}
                        disabled={isSubmitting ||
                            scoutingData.match.trim() === '' ||
                            scoutingData.alliance === null ||
                            scoutingData.teamNumber === null}>
                    {isSubmitting ? (
                        <div className="flex items-center gap-2">
                            <span
                                className="animate-spin h-4 w-4 border-2 rounded-full"/>
                            Submitting...
                        </div>
                    ) : phase === "post" ? "Submit" : "Next"}
                </Button>

            </div>
        </div>
    )
}

function PreMatch({
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

    const patchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (!match || !alliance || teamNumber === null) return

        if (patchTimeoutRef.current) clearTimeout(patchTimeoutRef.current)
        patchTimeoutRef.current = setTimeout(() => {
            void patchData(match, teamNumber, {
                match,
                alliance,
                teamNumber,
                scouter: SCOUTER,
            }, 'pre')
        }, 300)
    }, [match, alliance, teamNumber])

    useEffect(() => {
        if (!match || !alliance) return

        let mounted = true
        const load = async () => {
            const teams = await getTeamList(match, alliance)
            if (mounted) setTeamList(teams)
        }

        setTeamList(null)
        void load()

        const interval = setInterval(load, 500)

        return () => {
            mounted = false
            clearInterval(interval)
        }
    }, [match, alliance])

    const handleTeamSelect = async (newTeamNumber: number) => {
        setShowCustomTeam(false)

        if (match && teamNumber !== null && teamNumber !== newTeamNumber) {
            const oldTeamNumber = teamNumber

            // Optimistically mark old team unclaimed
            setTeamList((prev) => {
                if (!prev) return prev
                return prev.map((t) =>
                    t.number === oldTeamNumber ? {...t, scouter: null} : t
                )
            })

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
                    {(teamList ?? Array(3).fill(null)).map((team, i) => {
                        if (team === null) {
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
                                        {`Scouting by ${team.scouter === SCOUTER ? 'you' : team.scouter}`}
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


