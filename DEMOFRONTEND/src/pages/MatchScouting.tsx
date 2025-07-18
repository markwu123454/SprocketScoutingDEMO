import {useState, useEffect, useMemo} from 'react'
import { useScoutingSync } from '@/contexts/useScoutingSync'
import {Button} from '@/components/ui/button'

type ClimbType = 'none' | 'park' | 'shallow' | 'deep'
type IntakeType = 'none' | 'ground' | 'station' | 'both'

type ScoutingData = {
    match: string
    alliance: 'red' | 'blue' | null
    teamNumber: number | null

    auto: {
        l1: number
        l2: number
        l3: number
        l4: number
        missed: number
        reef: number
        barge: number
        moved: boolean
    }

    teleop: {
        l1: number
        l2: number
        l3: number
        l4: number
        missed: number
        reef: number
        barge: number
    }

    endgame: {
        climb: ClimbType
        success: boolean
    }

    postmatch:{
        intake: IntakeType

    }
}

const initialScoutingData: ScoutingData = {
    match: '',
    alliance: null,
    teamNumber: null,

    auto: {
        l1: 0,
        l2: 0,
        l3: 0,
        l4: 0,
        missed: 0,
        reef: 0,
        barge: 0,
        moved: false,
    },

    teleop: {
        l1: 0,
        l2: 0,
        l3: 0,
        l4: 0,
        missed: 0,
        reef: 0,
        barge: 0,
    },

    endgame: {
        climb: 'none',
        success: false,
    },

    postmatch:{
        intake: 'none',
    }
}

type Phase = 'pre' | 'auto' | 'teleop' | 'post'

const PHASE_ORDER: Phase[] = ['pre', 'auto', 'teleop', 'post']

const SCOUTER = 'DEMO'

type TeamInfo = {
    number: number
    name: string
    logo: string
}

export default function MatchScoutingLayout() {
    const [phaseIndex, setPhaseIndex] = useState(0)
    const phase = PHASE_ORDER[phaseIndex]
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [scoutingData, setScoutingData] = useState<ScoutingData>(initialScoutingData)

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
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setScoutingData(initialScoutingData)
        setPhaseIndex(0) // go back to pre-match
        setIsSubmitting(false)
    }

    const handleNext = () => {
        if (phaseIndex < PHASE_ORDER.length - 1) {
            setPhaseIndex((i) => i + 1)
        } else {
            // TODO: handle submit
            console.log('Submit match data')
        }
    }

    const handleBack = () => {
        if (phaseIndex > 0) {
            setPhaseIndex((i) => i - 1)
        } else {
            // TODO: handle submit
            console.log("can't back")
        }
    }

    return (
        <div className="w-screen h-screen flex flex-col bg-zinc-900 text-white">
            {/* Top Bar */}
            <div className="flex justify-between items-center p-4 bg-zinc-800 text-xl font-semibold">
                <div>
                    DEMO
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

export function PreMatch({
    data,
    setData,
}: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    const { patchData, getTeamList, getClaimedTeams } = useScoutingSync()
    const [teamList, setTeamList] = useState<TeamInfo[] | null>(null)
    const [claimed, setClaimed] = useState<number[]>([])
    const [showCustomTeam, setShowCustomTeam] = useState(false)

    const { match, alliance, teamNumber } = data

    // Load team list
    useEffect(() => {
        const load = async () => {
            setTeamList(null)
            setClaimed([])
            if (!match || !alliance) return
            const teams = await getTeamList(match, alliance)
            const claimed = await getClaimedTeams(match, teams, SCOUTER)
            setTeamList(teams)
            setClaimed(claimed)
        }
        load()
    }, [match, alliance])

    // Patch on full selection
    useEffect(() => {
        if (match && alliance && teamNumber !== null) {
            patchData(match, teamNumber, {
                match,
                alliance,
                teamNumber,
                scouter: SCOUTER,
            }, 'pre')
        }
    }, [match, alliance, teamNumber])

    return (
        <div className="p-4 w-full h-full flex flex-col justify gap-2">
            {/* Match Number */}
            <div>
                <label className="block text-lg font-medium mb-1">Match Number</label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={match}
                    onChange={(e) =>
                        setData((d) => ({
                            ...d,
                            match: e.target.value,
                            teamNumber: null,
                        }))
                    }
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
                            onClick={() =>
                                setData((d) => ({
                                    ...d,
                                    alliance: color,
                                    teamNumber: null,
                                }))
                            }
                            className={`w-16 h-16 rounded ${
                                alliance === color ? 'outline-2 outline-white' : ''
                            } ${color === 'red' ? 'bg-red-600' : 'bg-blue-600'}`}
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

                        const isClaimed = claimed.includes(team.number)
                        return (
                            <button
                                key={team.number}
                                disabled={isClaimed}
                                onClick={() => {
                                    setShowCustomTeam(false)
                                    setData((d) => ({
                                        ...d,
                                        teamNumber: team.number,
                                    }))
                                }}
                                className={`w-full py-2 px-4 rounded flex items-center justify-center gap-3 ${
                                    teamNumber === team.number
                                        ? 'bg-zinc-500'
                                        : 'bg-zinc-700'
                                } ${isClaimed ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <img
                                    src={team.logo}
                                    alt={team.name}
                                    className="w-8 h-8 rounded bg-zinc-600"
                                />
                                <span>{team.number}</span>
                                {isClaimed && <span className="text-sm">(CLAIMED)</span>}
                            </button>
                        )
                    })}

                    {!showCustomTeam ? (
                        <button
                            className="text-left text-sm text-zinc-400 underline mt-1"
                            onClick={() => {
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
                            onChange={(e) =>
                                setData((d) => ({
                                    ...d,
                                    teamNumber: parseInt(e.target.value || '0') || null,
                                }))
                            }
                            className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

function AutoPhase({
                       data,
                       setData,
                   }: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    const coralFields = ['l4', 'l3', 'l2', 'l1', 'missed'] as const
    const otherFields = ['reef', 'barge'] as const

    const handleUpdate = (field: keyof typeof data.auto, delta: number) => {
        const newValue = Math.max(0, data.auto[field] + delta)
        const pulseColor = delta > 0 ? 'bg-green-700' : 'bg-red-700'

        // Flash feedback
        const elem = document.getElementById(`auto-${field}`)
        if (elem) {
            elem.classList.remove('bg-zinc-800')
            elem.classList.add(pulseColor)
            setTimeout(() => {
                elem.classList.remove(pulseColor)
                elem.classList.add('bg-zinc-800')
            }, 150)
        }

        // Fields that imply movement
        const movementFields = ['l1', 'l2', 'l3', 'l4', 'barge', 'reef']
        const triggersMove = delta > 0 && movementFields.includes(field)

        setData((prev) => ({
            ...prev,
            auto: {
                ...prev.auto,
                [field]: newValue,
                moved: prev.auto.moved || triggersMove,
            },
        }))
    }


    const toggleMoved = () =>
        setData((prev) => ({
            ...prev,
            auto: {
                ...prev.auto,
                moved: !prev.auto.moved,
            },
        }))

    return (
        <div className="w-full h-full flex">
            {/* LEFT: Coral Scoring */}
            <div className="w-1/2 p-4 flex flex-col gap-3 border-r border-zinc-700">
                <div className="text-lg font-semibold mb-1">Coral Scoring</div>
                {coralFields.map((field) => (
                    <div
                        key={field}
                        id={`auto-${field}`}
                        className="relative w-full h-10 rounded bg-zinc-800 text-white flex items-center justify-center transition-colors duration-150"
                    >
                        <button
                            className="absolute left-0 w-1/2 h-full"
                            onClick={() => handleUpdate(field, -1)}
                        />
                        <button
                            className="absolute right-0 w-1/2 h-full"
                            onClick={() => handleUpdate(field, +1)}
                        />
                        <div className="pointer-events-none uppercase tracking-wide text-sm">
                            {field} ▷ {data.auto[field]}
                        </div>
                    </div>
                ))}
            </div>

            {/* RIGHT: Moved + Other */}
            <div className="w-1/2 p-4 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">Left starting area?</span>
                    <button
                        onClick={toggleMoved}
                        className={`w-24 py-2 rounded ${
                            data.auto.moved ? 'bg-green-600' : 'bg-red-600'
                        }`}
                    >
                        {data.auto.moved ? 'Yes' : 'No'}
                    </button>
                </div>

                {otherFields.map((field) => (
                    <div
                        key={field}
                        id={`auto-${field}`}
                        className="relative w-full h-10 rounded bg-zinc-800 text-white flex items-center justify-center transition-colors duration-150"
                    >
                        <button
                            className="absolute left-0 w-1/2 h-full"
                            onClick={() => handleUpdate(field, -1)}
                        />
                        <button
                            className="absolute right-0 w-1/2 h-full"
                            onClick={() => handleUpdate(field, +1)}
                        />
                        <div className="pointer-events-none uppercase tracking-wide text-sm">
                            {field} ▷ {data.auto[field]}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


function TeleopPhase({
                         data,
                         setData,
                     }: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    return <div>Teleop Phase Screen</div>
}

function PostMatch({
                       data,
                       setData,
                   }: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    return <div>Post-Match Screen</div>
}
