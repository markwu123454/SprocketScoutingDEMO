import {useState} from 'react'
import {useNavigate} from "react-router-dom";
import type {ScoutingData, Phase} from '@/types'

import {useScoutingSync, getScouterName} from '@/contexts/useScoutingSync'

import {Button} from '@/components/ui/button'
import LoadButton from '@/components/ui/loadButton'

import Pre from "@/pages/pre"

import AutoPhase from "@/components/2025/auto"
import TeleopPhase from "@/components/2025/teleop"
import PostMatch from "@/components/2025/post"
import {initialScoutingData} from "@/components/2025/default"


const PHASE_ORDER: Phase[] = ['pre', 'auto', 'teleop', 'post']

export default function MatchScoutingLayout() {
    const {patchData, submitData} = useScoutingSync()
    const scouterName = getScouterName()!

    const navigate = useNavigate()

    const [phaseIndex, setPhaseIndex] = useState(0)
    const phase = PHASE_ORDER[phaseIndex]

    const [scoutingData, setScoutingData] = useState<ScoutingData>({
        ...initialScoutingData,
        scouter: scouterName,
    })

    const [submitStatus, setSubmitStatus] =
        useState<'idle' | 'loading' | 'success' | 'error'>('idle')

    const baseDisabled =
        scoutingData.match_type === null ||
        scoutingData.match === 0 ||
        scoutingData.alliance === null ||
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

            <div className="flex-1 overflow-hidden text-4xl">
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
                    disabled={submitStatus === 'loading'}
                    className={
                        submitStatus === 'loading'
                            ? 'cursor-not-allowed opacity-50'
                            : 'cursor-pointer'
                    }
                >
                    {phaseIndex < 1 ? 'home' : 'back'}
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
