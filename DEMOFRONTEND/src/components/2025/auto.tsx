import {useState} from "react"
import type {ScoutingData} from "@/types"
import ScoreBox from "@/components/ui/scoreBox"
import fieldImage from "@/assets/2025_Field_No-Algae_Transparent_Blue.png"
import * as React from "react";

const coralLevels = ['l2', 'l3', 'l4'] as const
const coralBranches = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "missed"] as const

export default function AutoPhase({data, setData}: {
    data: ScoutingData,
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null)

    const [flash, setFlash] = useState<{ level: (typeof coralLevels)[number]; type: "add" | "remove" } | null>(null)

    const [missedMode, setMissedMode] = useState<"inc" | "dec">("inc")

    const handleLevelSelect = (level: (typeof coralLevels)[number]): "add" | "remove" => {
        let flashType: "add" | "remove" = "add"

        if (!selectedBranch) return flashType
        if (navigator.vibrate) navigator.vibrate(50)

        const updated = {...data.auto}

        if (selectedBranch === "missed") {
            if (missedMode === "inc") {
                updated.missed[level] += 1
                flashType = "add"
            } else {
                updated.missed[level] = Math.max(0, updated.missed[level] - 1)
                flashType = "remove"
            }
        } else {
            const current = updated.branchPlacement[selectedBranch][level]
            updated.branchPlacement[selectedBranch][level] = !current
            updated.moved = true
            flashType = current ? "remove" : "add"
        }

        setData(prev => ({...prev, auto: updated}))
        // Add patchsave

        return flashType
    }

    const toggleMoved = () => {
        const updated = {...data.auto, moved: !data.auto.moved}
        setData(prev => ({...prev, auto: updated}))
        // Add patchsave
    }

    const renderCoralHexGrid = () => {
        const generatePositions = () => {
            const labels = ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "A"] as const
            const centerTop = 20
            const centerLeft = 50
            const radius = 37.5

            return Object.fromEntries(
                (
                    labels.map((label, index) => {
                        const angleDeg = -165 + index * 30
                        const rad = (angleDeg * Math.PI) / 180
                        const top = centerTop - radius * Math.sin(rad)
                        const left = centerLeft + radius * Math.cos(rad)
                        return [label, {
                            top: `${(2 * top).toFixed(1)}%`,
                            left: `${left.toFixed(1)}%`,
                        }] as [string, { top: string; left: string }]
                    }) as [string, { top: string; left: string }][]
                ).concat([
                    ["missed", {top: "40%", left: "50%"}] as [string, { top: string; left: string }]
                ])
            )
        }


        const positions: Record<string, { top: string; left: string }> = generatePositions()


        return (
            <div className="relative w-full aspect-[2/1] max-w-4xl mx-auto">
                <img
                    src={fieldImage}
                    alt="Field"
                    className="w-full h-full object-contain pointer-events-none"
                    style={{
                        transform: "scale(1.7) translate(-21%, -27.5%)",
                        transformOrigin: "top left",
                    }}
                />


                {coralBranches.map((branch) => {
                    const pos = positions[branch]
                    const placed =
                        branch === "missed"
                            ? (["l2", "l3", "l4"] as const)
                                .filter((lvl) => data.auto.missed[lvl] > 0)
                                .map((lvl) => `${lvl.toUpperCase()}:${data.auto.missed[lvl]}`)
                                .join(" · ")
                            : (["l2", "l3", "l4"] as const)
                                .filter((lvl) => data.auto.branchPlacement[branch][lvl])
                                .map((lvl) => lvl.toUpperCase())
                                .join(",")

                    return (
                        <button
                            key={branch}
                            onClick={() => {
                                setSelectedBranch(branch)
                                if (branch === "missed") setMissedMode("inc")
                            }}
                            className={`absolute w-13 h-13 aspect-square rounded-full text-[10px] text-white text-center border border-white flex flex-col items-center justify-center leading-tight ${
                                selectedBranch === branch ? "bg-zinc-600" : "bg-zinc-800"
                            }`}
                            style={{
                                top: pos.top,
                                left: pos.left,
                                transform: "translate(-50%, -50%)"
                            }}
                        >
                            {branch === "missed" ? "Missed" : branch}
                            <br/>
                            <span className="text-[9px]">{placed || "—"}</span>
                        </button>
                    )
                })}
            </div>
        )
    }

    return (
        <div className="p-4 w-full h-full grid select-none gap-6"
             style={{
                 gridTemplateRows: 'auto 1fr auto auto'
             }}
        >
            <div className="text-xl font-semibold">Auto</div>

            {/* Growable coral grid section */}
            <div className="flex-1 min-h-0 flex items-center justify-center">
                {renderCoralHexGrid()}
            </div>

            <div className="flex gap-4 justify-center items-center shrink-0">
                {coralLevels.map((level) => (
                    <button
                        key={level}
                        onClick={() => {
                            const type = handleLevelSelect(level)
                            setFlash({level, type})
                            setTimeout(() => setFlash(null), 150)
                        }}

                        className={`px-4 py-2 rounded text-sm transition-colors duration-150 ${
                            flash?.level === level
                                ? flash.type === "add"
                                    ? "bg-green-600"
                                    : "bg-red-600"
                                : "bg-zinc-700 hover:bg-zinc-500"

                        }`}
                    >
                        {level.toUpperCase()}
                    </button>
                ))}

                {selectedBranch === "missed" && (
                    <button
                        onClick={() =>
                            setMissedMode(prev => (prev === "inc" ? "dec" : "inc"))
                        }
                        className={`px-3 py-2 rounded text-sm font-medium border ${
                            missedMode === "inc"
                                ? "bg-green-700 border-green-800"
                                : "bg-red-700 border-red-800"
                        }`}
                    >
                        {missedMode === "inc" ? "+" : "−"}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 shrink-0">
                <ScoreBox
                    id="auto-l1"
                    label="L1"
                    value={data.auto.l1}
                    onChange={(v) => {
                        const updated = {...data.auto, l1: v, moved: true}
                        setData(prev => ({...prev, auto: updated}))
                        // Add patchsave
                    }}
                />
                <ScoreBox
                    id="auto-missed-l1"
                    label="Missed L1"
                    value={data.auto.missed.l1}
                    onChange={(v) => {
                        const updated = {
                            ...data.auto,
                            missed: {...data.auto.missed, l1: v}
                        }
                        setData(prev => ({...prev, auto: updated}))
                        // Add patchsave
                    }}
                />
                <ScoreBox
                    id="auto-reef"
                    label="Reef"
                    value={data.auto.reef}
                    onChange={(v) => {
                        const updated = {...data.auto, reef: v, moved: true}
                        setData(prev => ({...prev, auto: updated}))
                        // Add patchsave
                    }}
                />
                <ScoreBox
                    id="auto-barge"
                    label="Barge"
                    value={data.auto.barge}
                    onChange={(v) => {
                        const updated = {...data.auto, barge: v, moved: true}
                        setData(prev => ({...prev, auto: updated}))
                        // Add patchsave
                    }}
                />
                <ScoreBox
                    id="auto-missAlgae"
                    label="Algae miss"
                    value={data.auto.missAlgae}
                    onChange={(v) => {
                        const updated = {
                            ...data.auto,
                            missAlgae: v,
                            moved: true
                        }
                        setData(prev => ({...prev, auto: updated}))
                        // Add patchsave
                    }}
                />

                <button
                    onClick={toggleMoved}
                    className={`text-sm px-2 py-0.5 rounded text-white ${
                        data.auto.moved ? "bg-green-600" : "bg-red-600"
                    }`}
                >
                    LEFT START: {data.auto.moved ? "YES" : "NO"}
                </button>
            </div>
        </div>
    )
}
