import {useState} from 'react'
import type {ScoutingData, Phase} from '@/types'

import {useScoutingSync, getScouterName} from '@/contexts/useScoutingSync'

import {Button} from '@/components/ui/button'
import LoadButton from '@/components/ui/loadButton'

import Pre from "@/pages/pre.tsx"
import AutoPhase from "@/components/2025/auto.tsx"
import TeleopPhase from "@/components/2025/teleop.tsx"
import PostMatch from "@/components/2025/post.tsx"

const initialScoutingData: Omit<ScoutingData, 'scouter'> = {
    match: null,
    match_type: "qm",
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
        missed: {l1: 0, l2: 0, l3: 0, l4: 0},
        l1: 0,
        reef: 0,
        barge: 0,
        missAlgae: 0,
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

    postmatch: {
        skill: 0,
        climbSpeed: 0,
        climbSuccess: false,
        offense: false,
        defense: false,
        faults: {system: false, idle: false, other: false},
        notes: '',
    }
}

const PHASE_ORDER: Phase[] = ['pre', 'auto', 'teleop', 'post']

export default function MatchScoutingLayout() {
    const {patchData, submitData} = useScoutingSync()
    const scouterName = getScouterName()!

    const [phaseIndex, setPhaseIndex] = useState(0)
    const phase = PHASE_ORDER[phaseIndex]

    const [scoutingData, setScoutingData] = useState<ScoutingData>({
        ...initialScoutingData,
        scouter: scouterName,
    })

    const [submitStatus, setSubmitStatus] =
        useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    // Removed alliance restriction because of lack of null flag
    const baseDisabled =
        scoutingData.match === 0 ||
        scoutingData.teamNumber === null

    const handleSubmit = async () => {
        if (baseDisabled) return

        setSubmitStatus('loading')
        const {match, match_type, teamNumber, alliance, scouter, ...rest} = scoutingData
        const fullData = {
            match_type: match_type,
            alliance,
            scouter: scouterName,
            data: rest as Omit<ScoutingData, 'match' | 'alliance' | 'teamNumber' | 'scouter'>,
        }

        try {
            const submitted = await submitData(Number(match), teamNumber!, fullData)
            if (!submitted) {
                console.error("submitData returned false")
                setSubmitStatus("error")
                return
            }

            setSubmitStatus('success')
            setTimeout(() => {
                setSubmitStatus('idle')
                setScoutingData({...initialScoutingData, scouter: scouterName})
                setPhaseIndex(0)
            }, 1000)
        } catch {
            setSubmitStatus('error')
            setTimeout(() => setSubmitStatus('idle'), 2000)
        }
    }

    const handleNext = async () => {
        if (baseDisabled) return
        const nextIndex = phaseIndex + 1
        setPhaseIndex(nextIndex)
        await patchData(scoutingData.match!, scoutingData.teamNumber!, {
            scouter: scouterName,
            phase: PHASE_ORDER[nextIndex],
        })
    }

    const handleBack = async () => {
        if (phaseIndex === 0) return
        const prevIndex = phaseIndex - 1
        setPhaseIndex(prevIndex)
        await patchData(scoutingData.match!, scoutingData.teamNumber!, {
            scouter: scouterName,
            phase: PHASE_ORDER[prevIndex],
        })
    }

    return (
        <div
            className="w-screen min-h-[100dvh] flex flex-col bg-zinc-900 text-white overflow-hidden touch-none select-none">
            <div className="flex justify-between items-center p-4 bg-zinc-800 text-ml font-semibold">
                <div>{scouterName}</div>
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

            <div className="flex-1 flex items-center justify-center text-4xl">
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

            <div className="flex justify-between items-center p-4 bg-zinc-800 text-xl font-semibold">
                <Button
                    onClick={handleBack}
                    disabled={submitStatus === 'loading' || phaseIndex < 1}
                    className={
                        submitStatus === 'loading' || phaseIndex < 1
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer'
                    }
                >
                    Back
                </Button>

                <LoadButton
                    status={submitStatus}
                    onClick={phase === 'post' ? handleSubmit : handleNext}
                    disabled={baseDisabled}
                    className={
                        baseDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                    }
                    message={submitStatus === 'success' ? 'Submitted!' : undefined}
                >
                    {phase === 'post' ? 'Submit' : 'Next'}
                </LoadButton>
            </div>
        </div>
    )
}
