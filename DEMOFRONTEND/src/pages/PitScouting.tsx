// import CameraCapture from "@/components/ui/cameraCapture" // TODO: enable later

import {useAPI} from "@/api/API.ts";
import * as React from "react";
import {useEffect, useState} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {AlertCircle, CheckCircle, XCircle} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";

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
    const [answers, setAnswers] = useState<Partial<Record<string, string>>>({});
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
            setSubmitted(true);
            setTimeout(() => {
                setTeamNumber("");
                setTeamInfo(null);
                setNotFound(false);
                setAnswers({});
                setSubmitted(false);
            }, 2000);
        }
    }

    const handleMultiToggle = (key: string, option: string, checked: boolean) => {
        setAnswers((prev) => {
            const current = Array.isArray(prev[key]) ? prev[key] : [];
            const updated = checked
                ? [...current, option]
                : current.filter((l: string) => l !== option);
            return {...prev, [key]: updated};
        });
    };


    return (
        <div className="min-h-screen bg-background overflow-x-hidden w-full text-foreground p-4">
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

                {/* --- Robot Info Section --- */}
                <div className="space-y-6">
                    <Label className="text-lg font-semibold">Robot Info</Label>

                    {/* --- Dimensions & Weight --- */}
                    <div>
                        <Label>Width (inches)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 28"
                            value={answers.width ?? ""}
                            onChange={(e) => setAnswers({...answers, width: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Length (inches)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 33"
                            value={answers.length ?? ""}
                            onChange={(e) => setAnswers({...answers, length: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Height (collapsed) (inches)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 22"
                            value={answers.heightCollapsed ?? ""}
                            onChange={(e) => setAnswers({...answers, heightCollapsed: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Height (extended) (inches)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 46"
                            value={answers.heightExtended ?? ""}
                            onChange={(e) => setAnswers({...answers, heightExtended: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Weight with bumpers and battery (pounds)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 118"
                            value={answers.weightFull ?? ""}
                            onChange={(e) => setAnswers({...answers, weightFull: e.target.value})}
                        />
                    </div>

                    {/* --- Drivetrain & Structure --- */}
                    <div>
                        <Label>Drivebase Type</Label>
                        <Input
                            placeholder="e.g. Swerve, Tank"
                            value={answers.drivebase ?? ""}
                            onChange={(e) => setAnswers({...answers, drivebase: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Cage Set</Label>
                        <Select onValueChange={(val) => setAnswers({...answers, cageSet: val})}>
                            <SelectTrigger><SelectValue placeholder="Select one"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="No Preference">No Preference</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Center of Gravity (collapsed) height (inches)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 10"
                            value={answers.cgCollapsed ?? ""}
                            onChange={(e) => setAnswers({...answers, cgCollapsed: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Center of Gravity (extended) height (inches)</Label>
                        <Input
                            type="number"
                            placeholder="e.g. 18"
                            value={answers.cgExtended ?? ""}
                            onChange={(e) => setAnswers({...answers, cgExtended: e.target.value})}
                        />
                    </div>

                    {/* --- Mechanism & Manipulation --- */}
                    <div>
                        <Label>Describe the intake</Label>
                        <Input
                            placeholder="e.g. Two rollers with polycord belts"
                            value={answers.intake ?? ""}
                            onChange={(e) => setAnswers({...answers, intake: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Scoring mechanism type</Label>
                        <Input
                            placeholder="e.g. Elevator, Arm, Shooter, Hybrid"
                            value={answers.mechanism ?? ""}
                            onChange={(e) => setAnswers({...answers, mechanism: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>What game pieces can it handle?</Label>
                        <Select onValueChange={(val) => setAnswers({...answers, pieces: val})}>
                            <SelectTrigger><SelectValue placeholder="Select one"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Coral">Coral</SelectItem>
                                <SelectItem value="Algae">Algae</SelectItem>
                                <SelectItem value="Both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Which levels can it score on?</Label>
                        <div className="flex flex-col space-y-1 mt-1">
                            {["L1", "L2", "L3", "L4"].map((level) => (
                                <label key={level} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={Array.isArray(answers.levels) && answers.levels.includes(level)}
                                        onChange={(e) => handleMultiToggle("levels", level, e.target.checked)}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    <span>{level}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* --- Strategy & Function --- */}
                    <div>
                        <Label>Defense or Offense</Label>
                        <Select onValueChange={(val) => setAnswers({...answers, role: val})}>
                            <SelectTrigger><SelectValue placeholder="Select one"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Defense">Defense</SelectItem>
                                <SelectItem value="Offense">Offense</SelectItem>
                                <SelectItem value="Both">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Auton start location</Label>
                        <Select onValueChange={(val) => setAnswers({...answers, autonStart: val})}>
                            <SelectTrigger><SelectValue placeholder="Select one"/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Center Field">Center Field</SelectItem>
                                <SelectItem value="Processor Side">Processor Side (Right)</SelectItem>
                                <SelectItem value="Opposite Side">Opposite Side (Left)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label>Primary teleop role / actions</Label>
                        <Input
                            placeholder="e.g. Scoring top coral, occasional algae removal"
                            value={answers.teleopAction ?? ""}
                            onChange={(e) => setAnswers({...answers, teleopAction: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>How many cycles per game / pieces scored?</Label>
                        <Input
                            placeholder="e.g. 6–7 cycles, 8 pieces total"
                            value={answers.cycles ?? ""}
                            onChange={(e) => setAnswers({...answers, cycles: e.target.value})}
                        />
                    </div>

                    <div>
                        <Label>Climb or Endgame capability</Label>
                        <Input
                            placeholder="e.g. Can hang on mid bar"
                            value={answers.climb ?? ""}
                            onChange={(e) => setAnswers({...answers, climb: e.target.value})}
                        />
                    </div>

                    {/* --- Optional / Miscellaneous --- */}
                    <div>
                        <Label>Programming highlights</Label>
                        <div className="flex flex-col space-y-1 mt-1">
                            {[
                                {key: "vision", label: "Vision alignment"},
                                {key: "path planner", label: "Path planner path gen."},
                                {key: "driver assist", label: "Teleop driver assist"},
                            ].map((prog) => (
                                <label key={prog.key} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={Array.isArray(answers.programming) && answers.programming.includes(prog.key)}
                                        onChange={(e) => handleMultiToggle("programming", prog.key, e.target.checked)}
                                        className="h-4 w-4 accent-primary"
                                    />
                                    <span>{prog.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label>Robot name</Label>
                        <Input
                            placeholder=""
                            value={answers.comments ?? ""}
                            onChange={(e) => setAnswers({...answers, comments: e.target.value})}
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
                        disabled={submitting}
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