// 1. React built-ins
import {useState, useEffect} from 'react'

// 2. Routing
import {useNavigate} from "react-router-dom"

// 3. Types
import type {ScoutingData, Phase, ScoutingStatus} from '@/types'

// 4. Contexts and utilities
import {useAPI, getScouterName} from '@/api/API.ts'
import {useClientEnvironment} from "@/hooks/useClientEnvironment.ts"
import {saveScoutingData, deleteScoutingData, db, type ScoutingDataWithKey, updateScoutingStatus} from "@/db/db.ts"
import {clearEnteredOfflineFlag} from "@/components/AuthGate.tsx"

// 5. UI components
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog"
import {Button} from '@/components/ui/button'
import LoadButton from '@/components/ui/loadButton'

// 6. Pages
import Pre from "@/pages/Pre.tsx"

// 7. App-specific components
import AutoPhase from "@/components/seasons/2025/Auto.tsx"
import TeleopPhase from "@/components/seasons/2025/Teleop.tsx"
import PostMatch from "@/components/seasons/2025/Post.tsx"
import {initialScoutingData} from "@/components/seasons/2025/yearConfig.ts"

const PHASE_ORDER: Phase[] = ['pre', 'auto', 'teleop', 'post']

export function MatchScoutingLayout() {
    // 1. External hooks
    const navigate = useNavigate()

    const {patchData, submitData, verify} = useAPI()
    const {isOnline, serverOnline} = useClientEnvironment()
    const scouterName = getScouterName()!

    // 2. State
    const [phaseIndex, setPhaseIndex] = useState(0)
    const [scoutingData, setScoutingData] = useState<ScoutingData>({
        ...initialScoutingData,
        scouter: scouterName,
    })
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'local' | 'error' | 'warning'>('idle')
    const [resumeCandidate, setResumeCandidate] = useState<ScoutingDataWithKey | null>(null)
    const [showResumeDialog, setShowResumeDialog] = useState(false)


    // 3. Derived constants
    const phase = PHASE_ORDER[phaseIndex]
    const baseDisabled =
        scoutingData.match_type === null ||
        scoutingData.match === 0 ||
        scoutingData.alliance === null ||
        scoutingData.teamNumber === null

    // 4. Effects
    useEffect(() => {
        (async () => {
            const entries: ScoutingDataWithKey[] = await db.scouting.toArray()

            const active = entries.find(e =>
                ['pre', 'auto', 'teleop', 'post'].includes(e.status)
            )

            if (active) {
                setResumeCandidate(active)
                setShowResumeDialog(true)
            } else {
                setScoutingData({...initialScoutingData, scouter: scouterName})
                setPhaseIndex(0)
            }
        })()
    }, [])


    useEffect(() => {
        const interval = setInterval(() => {
            const {match, match_type, teamNumber} = scoutingData
            if (!match || !match_type || teamNumber == null) return

            const status = PHASE_ORDER[phaseIndex] as ScoutingStatus

            saveScoutingData(scoutingData, status).catch(err => {
                console.error("Autosave failed", err)
            })
        }, 3000)

        return () => clearInterval(interval)
    }, [scoutingData, phaseIndex])


    // 5. Event handlers
    const handleSubmit = async () => {
        if (baseDisabled) return

        setSubmitStatus("loading")
        const {match, match_type, teamNumber, alliance, scouter, ...rest} = scoutingData

        const fullData = {
            match_type,
            alliance,
            scouter: scouterName,
            data: rest as Omit<ScoutingData, "match" | "alliance" | "teamNumber" | "scouter">,
        }

        const offlineAtSubmit = !isOnline || !serverOnline

        try {
            if (offlineAtSubmit) {
                await updateScoutingStatus(match_type!, match!, teamNumber!, "completed")

                setSubmitStatus("local")

                setTimeout(async () => {
                    // Clear the offline flag *before* verify so AuthGate kicks if invalid
                    clearEnteredOfflineFlag()

                    const result = await verify()
                    const allowed = result.success && result.permissions?.match_scouting
                    if (!allowed) return // AuthGate will now show access denied

                    // Reset after local save
                    setSubmitStatus("idle")
                    setScoutingData({...initialScoutingData, scouter: scouterName})
                    setPhaseIndex(0)
                }, 1000)
            } else {
                const submitted = await submitData(Number(match), teamNumber!, fullData)
                if (!submitted) {
                    console.error("submitData returned false")
                    setSubmitStatus("error")
                    return
                }

                clearEnteredOfflineFlag()

                await deleteScoutingData(match_type!, match!, teamNumber!)

                setSubmitStatus("success")
                setTimeout(() => {
                    setSubmitStatus("idle")
                    setScoutingData({...initialScoutingData, scouter: scouterName})
                    setPhaseIndex(0)
                }, 1000)
            }
        } catch (err) {
            await updateScoutingStatus(match_type!, match!, teamNumber!, "completed")
            setSubmitStatus("warning")

            setTimeout(async () => {
                clearEnteredOfflineFlag()
                const result = await verify()
                const allowed = result.success && result.permissions?.match_scouting
                if (!allowed) return
                setSubmitStatus("idle")
                setScoutingData({...initialScoutingData, scouter: scouterName})
                setPhaseIndex(0)
            }, 1000)
        }
    }

    const handleNext = async () => {
        if (baseDisabled) return
        const nextIndex = phaseIndex + 1
        setPhaseIndex(nextIndex)
        await patchData(scoutingData.match!, scoutingData.teamNumber!, scoutingData.match_type, {
            scouter: scouterName,
            phase: PHASE_ORDER[nextIndex],
        })
    }

    const handleBack = async () => {
        if (phaseIndex === 0) {
            navigate("/")
            return
        }

        const prevIndex = phaseIndex - 1
        setPhaseIndex(prevIndex)

        await patchData(scoutingData.match!, scoutingData.teamNumber!, scoutingData.match_type, {
            scouter: scouterName,
            phase: PHASE_ORDER[prevIndex],
        })
    }


    return (
        <>
            <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
                <DialogContent className="bg-zinc-800 border-zinc-500">
                    <DialogHeader className="text-zinc-400">
                        <DialogTitle>Resume Previous Session?</DialogTitle>
                    </DialogHeader>

                    <div className="text-sm text-zinc-400">
                        A partially completed scouting session for <strong>Match {resumeCandidate?.match}</strong>,
                        Team <strong>{resumeCandidate?.teamNumber}</strong> was found.
                    </div>

                    <DialogFooter className="mt-4 flex gap-2">
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                if (resumeCandidate) {
                                    await db.scouting.delete(resumeCandidate.key)
                                }
                                setScoutingData({...initialScoutingData, scouter: scouterName})
                                setPhaseIndex(0)
                                setShowResumeDialog(false)
                            }}
                        >
                            Discard
                        </Button>

                        <Button
                            className="bg-zinc-600"
                            onClick={() => {
                                if (resumeCandidate) {
                                    setScoutingData({...resumeCandidate})
                                    setPhaseIndex(PHASE_ORDER.indexOf(resumeCandidate.status as Phase))
                                }
                                setShowResumeDialog(false)
                            }}
                        >
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="w-screen min-h-0 h-screen flex flex-col overflow-hidden bg-zinc-900 text-white touch-none select-none">
                {/* Top Bar */}
                <div className="h-12 flex justify-between items-center px-4 bg-zinc-800 text-ml font-semibold shrink-0">
                    <div>{scouterName}</div>
                    <div>
                        {scoutingData.teamNumber !== null
                            ? `Team ${scoutingData.teamNumber}`
                            : 'Team –'}
                    </div>
                    <div>
                        Match #{scoutingData.match || '–'} ({scoutingData.alliance?.toUpperCase() || '–'})
                    </div>
                    <div className="capitalize">{phase}</div>
                </div>

                {/* Middle Section (Phases) */}
                <div className="flex-1 min-h-0 overflow-hidden text-4xl h-full">
                    {phase === 'pre' && (
                        <Pre key="pre" data={scoutingData} setData={setScoutingData}/>
                    )}
                    {phase === 'auto' && (
                        <AutoPhase key="auto" data={scoutingData} setData={setScoutingData}/>
                    )}
                    {phase === 'teleop' && (
                        <TeleopPhase key="teleop" data={scoutingData} setData={setScoutingData}/>
                    )}
                    {phase === 'post' && (
                        <PostMatch key="post" data={scoutingData} setData={setScoutingData}/>
                    )}
                </div>

                {/* Bottom Bar */}
                <div className="h-16 relative flex justify-between items-center px-4 bg-zinc-800 text-xl font-semibold shrink-0">
                    <Button
                        onClick={handleBack}
                        disabled={submitStatus === 'loading'}
                        className={
                            submitStatus === 'loading'
                                ? 'cursor-not-allowed opacity-50'
                                : 'cursor-pointer'
                        }
                    >
                        {phaseIndex < 1 ? 'home' : 'back'}
                    </Button>

                    <div
                        className="absolute left-1/2 transform -translate-x-1/2 text-base text-zinc-400 pointer-events-none select-none">
                        {isOnline && serverOnline ? "Online" : "Offline"}
                    </div>

                    <LoadButton
                        status={submitStatus === "local" ? "success" : submitStatus}
                        onClick={phase === 'post' ? handleSubmit : handleNext}
                        disabled={baseDisabled}
                        className={
                            baseDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        }
                        message={
                            submitStatus === "success"
                                ? "Submitted!"
                                : submitStatus === "local"
                                    ? "Saved Locally"
                                    : undefined
                        }
                    >
                        {phase === 'post' ? 'Submit' : 'Next'}
                    </LoadButton>
                </div>
            </div>

        </>
    )
}
