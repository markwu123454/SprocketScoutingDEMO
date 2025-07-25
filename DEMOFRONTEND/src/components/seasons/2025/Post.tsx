import React from "react"
import type {ScoutingData} from "@/types"
import RatingSlider from "@/components/ui/ratingSlider.tsx"
import InfoToggle from "@/components/ui/infoToggle.tsx" // adjust path if needed

export default function PostMatch({
    data,
    setData,
}: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {

    const handleChange = (field: keyof ScoutingData["postmatch"]) => (val: number) => {
        const updated = {
            ...data.postmatch,
            [field]: val
        }
        setData(prev => ({...prev, postmatch: updated}))
    }

    const toggleFault = (key: keyof ScoutingData["postmatch"]["faults"]) => () => {
        const updated = {
            ...data.postmatch.faults,
            [key]: !data.postmatch.faults[key]
        }
        setData(prev => ({
            ...prev,
            postmatch: {
                ...prev.postmatch,
                faults: updated
            }
        }))
    }

    const updateNotes = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setData(prev => ({
            ...prev,
            postmatch: {
                ...prev.postmatch,
                notes: e.target.value
            }
        }))
    }

    const toggleClimbSuccess = () => {
        setData(prev => ({
            ...prev,
            postmatch: {
                ...prev.postmatch,
                climbSuccess: !prev.postmatch.climbSuccess
            }
        }))
    }

    const togglePlayedRole = (role: 'offense' | 'defense') => () => {
        setData(prev => ({
            ...prev,
            postmatch: {
                ...prev.postmatch,
                [role]: !prev.postmatch[role]
            }
        }))
    }

    return (
        <div className="p-4 w-full max-w-sm">
            <div className="text-xl font-semibold mb-4">Post-Match Screen</div>
            <RatingSlider
                value={data.postmatch.skill}
                onChange={handleChange("skill")}
                title="Driver skill"
                leftLabel="Lacking"
                rightLabel="Skilled"
                infoBox={
                    <div>
                        <strong>Assess driver's control of robot, defense skill, and field awareness</strong><br/><br/>
                        <strong>Lacking:</strong> Frequently trapped or interfered by other robots, struggles to
                        maintain control.<br/>
                        <strong>Skilled:</strong> Maintains control under pressure, evades defense effectively, or
                        successfully defends when needed.
                    </div>
                }
            />

            <RatingSlider
                value={data.postmatch.climbSpeed}
                onChange={handleChange("climbSpeed")}
                title="Climb speed"
                leftLabel="Slow"
                rightLabel="Fast"
                infoBox={
                    <div>
                        <strong>How long did it take the robot to drive to the reef, align, and lift off from the ground</strong><br/><br/>
                        <strong>Fast:</strong> &lt;2 seconds.<br/>
                        <strong>Medium:</strong> ~15 seconds.<br/>
                        <strong>Slow:</strong> &gt;30 seconds.
                    </div>
                }
            />

            <div className="flex gap-2 mt-4">
                <button
                    onClick={togglePlayedRole("offense")}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-sm w-28 ${
                        data.postmatch.offense ? "bg-green-600" : "bg-red-600"
                    }`}
                >
                    Played Offense: {data.postmatch.offense ? "Yes" : "No"}
                </button>
                <button
                    onClick={togglePlayedRole("defense")}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-sm w-28 ${
                        data.postmatch.defense ? "bg-green-600" : "bg-red-600"
                    }`}
                >
                    Played Defense: {data.postmatch.defense ? "Yes" : "No"}
                </button>
                <button
                    onClick={toggleClimbSuccess}
                    className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-sm w-28 ${
                        data.postmatch.climbSuccess ? "bg-green-600" : "bg-red-600"
                    }`}
                >
                    Climb Success: {data.postmatch.climbSuccess ? "Yes" : "No"}
                </button>
            </div>

            <div className="text-xl font-semibold mb-4 border-t border-zinc-500 mt-6 pt-2">
                Faults & Failures
            </div>
            <div className="flex gap-2 mt-2">
                <InfoToggle
                    value={data.postmatch.faults.system}
                    onToggle={toggleFault("system")}
                    label="Sys"
                    infoBox="Subsystem mechanical or partial electrical failure (e.g. intake jam, shooter motor died, broken elevator)"
                />
                <InfoToggle
                    value={data.postmatch.faults.idle}
                    onToggle={toggleFault("idle")}
                    label="Idle"
                    infoBox="Total loss of mobility or comms (e.g. brownout, drivetrain failure, power loss)"
                />
                <InfoToggle
                    value={data.postmatch.faults.other}
                    onToggle={toggleFault("other")}
                    label="Other"
                    infoBox="Anything not covered by the other options (e.g. field issue, stuck on game piece, tipped over)"
                />
            </div>

            <textarea
                value={data.postmatch.notes}
                onChange={updateNotes}
                placeholder="Optional: any other note-worthy information"
                className="w-full mt-2 p-2 rounded bg-zinc-800 text-base text-zinc-100 resize-none h-16"
            />
        </div>
    )
}
