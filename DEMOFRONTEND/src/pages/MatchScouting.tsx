import {useState} from 'react'
import type {ScoutingData, Phase} from '@/types'

import {useScoutingSync, getScouterName} from '@/contexts/useScoutingSync'

import {Button} from '@/components/ui/button'
import LoadButton from '@/components/ui/loadButton'

import PreMatch from "@/pages/preMatch.tsx";
import AutoPhase from "@/components/2025/auto.tsx";
import TeleopPhase from "@/components/2025/teleop.tsx";
import PostMatch from "@/components/2025/post.tsx";


const initialScoutingData: ScoutingData = {
    match: '',
    alliance: null,
    teamNumber: null,
    scouter: null,

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

const scouter = getScouterName()

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
                    {scouter}
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

            {/* Bottom Action Bar */}
            <div className="flex justify-between items-center p-4 bg-zinc-800 text-xl font-semibold">
                <Button
                    onClick={handleBack}
                    disabled={isSubmitting || phaseIndex < 1}
                    className={isSubmitting || phaseIndex < 1 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                >
                    Back
                </Button>

                <LoadButton
                    loading={isSubmitting}
                    onClick={phase === "post" ? handleSubmit : handleNext}
                    disabled={
                        scoutingData.match.trim() === '' ||
                        scoutingData.alliance === null ||
                        scoutingData.teamNumber === null
                    }
                    className={
                        scoutingData.match.trim() === '' ||
                        scoutingData.alliance === null ||
                        scoutingData.teamNumber === null
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                    }
                >
                    {phase === "post" ? "Submit" : "Next"}
                </LoadButton>
            </div>
        </div>
    )
}

