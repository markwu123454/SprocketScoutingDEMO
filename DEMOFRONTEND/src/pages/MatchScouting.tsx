import {useState, useEffect} from 'react'
import {useScoutingSync} from '@/contexts/useScoutingSync'
import {Button} from '@/components/ui/button'
import type {ScoutingData, Phase, TeamInfo} from '@/types'

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
        await patchData(scoutingData.match, scoutingData.teamNumber!, {}, "completed")
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setScoutingData(initialScoutingData)
        setPhaseIndex(0) // go back to pre-match
        setIsSubmitting(false)
    }

    const handleNext = async () => {
        if (phaseIndex < PHASE_ORDER.length - 1) {
            const nextIndex = phaseIndex + 1
            setPhaseIndex(nextIndex)
            await patchData(scoutingData.match, scoutingData.teamNumber!, {}, PHASE_ORDER[nextIndex])
        } else {
            console.log('Submit match data')
            // TODO: Change to actual submit logic

        }
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
        <div className="w-screen min-h-[100dvh] flex flex-col bg-zinc-900 text-white">
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

export function PreMatch({
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

    // Load team list periodically
    useEffect(() => {
        let interval: NodeJS.Timeout

        const load = async () => {
            if (!match || !alliance) return
            const teams = await getTeamList(match, alliance)
            setTeamList(teams)
        }

        // Clear immediately
        setTeamList(null)

        load()
        interval = setInterval(load, 500)

        return () => clearInterval(interval)
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

    const handleTeamSelect = async (newTeamNumber: number) => {
        setShowCustomTeam(false)
        if (teamNumber !== null && teamNumber !== newTeamNumber) {
            await patchData(match!, teamNumber, {
                match,
                alliance,
                teamNumber,
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
                        if (teamNumber !== null) patchData(match!, teamNumber, {
                            match,
                            alliance,
                            teamNumber,
                            scouter: "__UNCLAIM__",
                        }, 'pre')
                        setData((d) => ({
                            ...d,
                            match: e.target.value,
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
                                if (teamNumber !== null) patchData(match!, teamNumber, {
                                    match,
                                    alliance,
                                    teamNumber,
                                    scouter: "__UNCLAIM__",
                                }, 'pre')
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
                        const isClaimed = team.scouter !== null && team.scouter !== SCOUTER

                        return (
                            <button
                                key={team.number}
                                disabled={isClaimed}
                                onClick={() => handleTeamSelect(team.number)}
                                className={`w-full py-2 px-4 rounded flex items-center justify-center gap-3 ${
                                    isSelected ? 'bg-zinc-500' : 'bg-zinc-700'
                                } ${isClaimed ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                        (Claimed by {team.scouter})
                                    </span>
                                )}
                            </button>
                        )
                    })}

                    {!showCustomTeam ? (
                        <button
                            className="text-left text-sm text-zinc-400 underline mt-1"
                            onClick={() => {
                                if (teamNumber !== null) patchData(match!, teamNumber, {
                                    match,
                                    alliance,
                                    teamNumber,
                                    scouter: "__UNCLAIM__",
                                }, 'pre')
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


function AutoPhase({data, setData}: {
    data: ScoutingData,
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    const {patchData, getTeamList} = useScoutingSync()
    const coralFields = ['l4', 'l3', 'l2', 'l1', 'missed'] as const
    const otherFields = ['reef', 'barge'] as const

    const handleUpdate = (field: keyof typeof data.auto, delta: number) => {
        const newValue = Math.max(0, data.auto[field] + delta)
        const pulseColor = delta > 0 ? 'bg-green-700' : 'bg-red-700'
        const elem = document.getElementById(`auto-${field}`)
        if (elem) {
            elem.classList.remove('bg-zinc-800')
            elem.classList.add(pulseColor)
            setTimeout(() => {
                elem.classList.remove(pulseColor)
                elem.classList.add('bg-zinc-800')
            }, 150)
        }

        const movementFields = ['l1', 'l2', 'l3', 'l4', 'barge', 'reef']
        const triggersMove = delta > 0 && movementFields.includes(field)

        const updated = {
            ...data.auto,
            [field]: newValue,
            moved: data.auto.moved || triggersMove,
        }

        setData(prev => ({...prev, auto: updated}))
        patchData(data.match, data.teamNumber!, {auto: updated}, 'auto')
    }

    const toggleMoved = () => {
        const updated = {...data.auto, moved: !data.auto.moved}
        setData(prev => ({...prev, auto: updated}))
        patchData(data.match, data.teamNumber!, {auto: updated}, 'auto')
    }

    return (
        <div className="w-full h-full">
            <div>Auto</div>
            <div className="flex">
                <div className="w-1/2 p-4 flex flex-col gap-3 border-r border-zinc-700">
                    <div className="text-lg font-semibold mb-1">Coral Scoring</div>
                    {coralFields.map((field) => (
                        <div key={field} id={`auto-${field}`}
                             className="relative w-full h-10 rounded bg-zinc-800 text-white flex items-center justify-center transition-colors duration-150">
                            <button className="absolute left-0 w-1/2 h-full" onClick={() => handleUpdate(field, -1)}/>
                            <button className="absolute right-0 w-1/2 h-full" onClick={() => handleUpdate(field, +1)}/>
                            <div
                                className="pointer-events-none uppercase tracking-wide text-sm">{field} ▷ {data.auto[field]}</div>
                        </div>
                    ))}
                </div>
                <div className="w-1/2 p-4 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-medium">Left starting area?</span>
                        <button onClick={toggleMoved}
                                className={`w-24 py-2 rounded ${data.auto.moved ? 'bg-green-600' : 'bg-red-600'}`}>{data.auto.moved ? 'Yes' : 'No'}</button>
                    </div>
                    {otherFields.map((field) => (
                        <div key={field} id={`auto-${field}`}
                             className="relative w-full h-10 rounded bg-zinc-800 text-white flex items-center justify-center transition-colors duration-150">
                            <button className="absolute left-0 w-1/2 h-full" onClick={() => handleUpdate(field, -1)}/>
                            <button className="absolute right-0 w-1/2 h-full" onClick={() => handleUpdate(field, +1)}/>
                            <div
                                className="pointer-events-none uppercase tracking-wide text-sm">{field} ▷ {data.auto[field]}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function TeleopPhase({data, setData}: {
    data: ScoutingData,
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    const {patchData, getTeamList} = useScoutingSync()
    const coralFields: (keyof ScoutingData['teleop'])[] = ['l4', 'l3', 'l2', 'l1', 'coralMissed']
    const otherFields: (keyof ScoutingData['teleop'])[] = ['reef', 'barge', 'algaeMissed']


    const handleUpdate = (field: keyof ScoutingData['teleop'], delta: number) => {
        const newValue = Math.max(0, data.teleop[field] + delta)
        const pulseColor = delta > 0 ? 'bg-green-700' : 'bg-red-700'
        const elem = document.getElementById(`teleop-${field}`)
        if (elem) {
            elem.classList.remove('bg-zinc-800')
            elem.classList.add(pulseColor)
            setTimeout(() => {
                elem.classList.remove(pulseColor)
                elem.classList.add('bg-zinc-800')
            }, 150)
        }

        const updated = {...data.teleop, [field]: newValue}
        setData(prev => ({...prev, teleop: updated}))
        patchData(data.match, data.teamNumber!, {teleop: updated}, 'teleop')
    }

    return (
        <div className="w-full h-full">
            <div>Tele-Op</div>
            <div className="flex">
                <div className="w-1/2 p-4 flex flex-col gap-3 border-r border-zinc-700">
                    <div className="text-lg font-semibold mb-1">Coral Scoring</div>
                    {coralFields.map((field) => (
                        <div key={field} id={`teleop-${field}`}
                             className="relative w-full h-10 rounded bg-zinc-800 text-white flex items-center justify-center transition-colors duration-150">
                            <button className="absolute left-0 w-1/2 h-full" onClick={() => handleUpdate(field, -1)}/>
                            <button className="absolute right-0 w-1/2 h-full" onClick={() => handleUpdate(field, +1)}/>
                            <div
                                className="pointer-events-none uppercase tracking-wide text-sm">{field} ▷ {data.teleop[field]}</div>
                        </div>
                    ))}
                </div>
                <div className="w-1/2 p-4 flex flex-col gap-3 border-r border-zinc-700">
                    <div className="text-lg font-semibold mb-1">Algae Scoring</div>
                    {otherFields.map((field) => (
                        <div key={field} id={`teleop-${field}`}
                             className="relative w-full h-10 rounded bg-zinc-800 text-white flex items-center justify-center transition-colors duration-150">
                            <button className="absolute left-0 w-1/2 h-full" onClick={() => handleUpdate(field, -1)}/>
                            <button className="absolute right-0 w-1/2 h-full" onClick={() => handleUpdate(field, +1)}/>
                            <div
                                className="pointer-events-none uppercase tracking-wide text-sm">{field} ▷ {data.teleop[field]}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}


// @ts-ignore
function PostMatch({
                       data,
                       setData,
                   }: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    return <div>Post-Match Screen</div>
}
