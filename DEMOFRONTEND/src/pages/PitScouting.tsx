// import CameraCapture from "@/components/ui/cameraCapture" // TODO: enable later

import {useAPI} from "@/api/API.ts";
import * as React from "react";
import {useEffect, useState} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {AlertCircle, CheckCircle, XCircle} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";

export default function PitScoutingLayout() {
    const {getTeamBasicInfo, submitPitData} = useAPI()
    const [teamNumber, setTeamNumber] = useState("")
    const [teamInfo, setTeamInfo] = useState<{
        number?: number
        nickname?: string
        rookie_year?: number | null
        scouted?: boolean
    } | null>(null)
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [notFound, setNotFound] = useState(false)
    const [answers, setAnswers] = useState({
        drivetrain: "",
        weight: "",
        shooter: ""
    })
    const [submitted, setSubmitted] = useState(false)

    // --- Auto fetch team info whenever teamNumber changes ---
    useEffect(() => {
        if (!teamNumber) {
            setTeamInfo(null)
            setNotFound(false)
            return
        }
        setLoading(true)
        const timeout = setTimeout(async () => {
            const info = await getTeamBasicInfo(teamNumber)
            setTeamInfo(info)
            setLoading(false)
            setNotFound(!info)
        }, 400) // debounce

        return () => clearTimeout(timeout)
    }, [teamNumber])

    // --- Submit handler ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!teamNumber || notFound) return

        setSubmitting(true)
        const scouter =
            document.cookie
                .split("; ")
                .find(r => r.startsWith("scouting_name="))
                ?.split("=")[1] || "unknown"

        const success = await submitPitData(teamNumber, scouter, answers)
        setSubmitting(false)

        if (success) {
            setSubmitted(true)
            setTimeout(() => {
                setTeamNumber("")
                setTeamInfo(null)
                setNotFound(false)
                setAnswers({drivetrain: "", weight: "", shooter: ""})
                setSubmitted(false)
            }, 2000)
        }
    }

    return (
        <div className="h-screen overflow-y-auto bg-background text-foreground p-4">
            <form onSubmit={handleSubmit} className="space-y-6 max-w-xl mx-auto">
                {/* --- Team Input Section --- */}
                <div>
                    <Label htmlFor="teamNumber" className="text-lg font-semibold">
                        Enter Team Number
                    </Label>
                    <Input
                        id="teamNumber"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="e.g. 3473"
                        value={teamNumber}
                        onChange={(e) => {
                            const val = e.target.value
                            if (val === "" || (/^\d{0,5}$/.test(val))) setTeamNumber(val)
                        }}
                        className="w-40 mt-1"
                    />

                    {/* --- Inline team info display --- */}
                    <div className="mt-3 flex items-center justify-between p-2 border rounded-lg min-h-[60px]">
                        {/* --- Left side: team icon + info --- */}
                        <div className="flex items-center space-x-3">
                            {!loading && teamInfo && !notFound && (
                                <img
                                    key={teamNumber}
                                    src={`/teams/team_icons/${teamNumber}.png`}
                                    alt={`${teamNumber} icon`}
                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                    className="w-10 h-10 border border-border bg-blue-600"
                                />
                            )}

                            <div className="flex flex-col">
                                {loading && (
                                    <span className="text-sm text-muted-foreground">Fetching...</span>
                                )}
                                {!loading && notFound && (
                                    <span className="text-sm text-destructive">Team not found.</span>
                                )}
                                {!loading && teamInfo && (
                                    <>
                                        <div className="font-semibold text-base">
                                            Team {teamInfo.number ?? teamNumber}
                                        </div>
                                        <div className="text-sm opacity-80">
                                            {teamInfo.nickname ?? "Unknown"}
                                        </div>
                                        {teamInfo.scouted && (
                                            <div className="text-xs text-orange-500 mt-1 flex items-center space-x-1">
                                                <span>Team already scouted, re-scouting will override existing data.</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* --- Right side: status icon --- */}
                        <div className="flex items-center">
                            {!loading && teamInfo?.scouted && !notFound && (
                                <AlertCircle className="w-6 h-6 text-orange-500"/>
                            )}
                            {!loading && teamInfo && !notFound && !teamInfo.scouted && (
                                <CheckCircle className="w-6 h-6 text-green-500"/>
                            )}
                            {!loading && notFound && (
                                <XCircle className="w-6 h-6 text-red-500"/>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- TODO: CameraCapture --- */}
                {/* <CameraCapture title="Robot Photos" ... /> */}

                {/* --- Questions --- */}
                <div className="space-y-4">
                    <div>
                        <Label>Drivetrain Type</Label>
                        <Input
                            placeholder="e.g. Swerve, Tank"
                            autoComplete="off"
                            value={answers.drivetrain}
                            onChange={(e) => setAnswers({...answers, drivetrain: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Robot Weight (kg)</Label>
                        <Input
                            type="number"
                            autoComplete="off"
                            placeholder="e.g. 54"
                            value={answers.weight}
                            onChange={(e) => setAnswers({...answers, weight: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Shooter Mechanism</Label>
                        <Input
                            placeholder="e.g. Double flywheel"
                            autoComplete="off"
                            value={answers.shooter}
                            onChange={(e) => setAnswers({...answers, shooter: e.target.value})}
                        />
                    </div>
                </div>

                {/* --- Submit --- */}
                <div className="pt-6 flex w-full space-x-2 items-center">
                    <Button
                        type="button"
                        className="w-1/5"
                        variant="secondary"
                        onClick={() => window.history.back()}
                        disabled={loading || submitting}
                    >
                        Back
                    </Button>

                    <Button
                        type="submit"
                        className="w-4/5 flex items-center justify-center space-x-2"
                        disabled={loading || submitting || notFound || !teamNumber}
                    >
                        {submitted ? (
                            <>
                                <CheckCircle className="w-7 h-7 text-green-500"/>
                                <span>Submitted!</span>
                            </>
                        ) : !teamNumber ? (
                            "Enter a team number"
                        ) : loading ? (
                            "Loading..."
                        ) : submitting ? (
                            "Submitting..."
                        ) : notFound ? (
                            "Team not found."
                        ) : (
                            "Submit Pit Data"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}