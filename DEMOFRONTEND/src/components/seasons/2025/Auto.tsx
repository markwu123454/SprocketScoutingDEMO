import {useState} from "react"
import type {ScoutingData} from "@/types"
import ScoreBox from "@/components/ui/scoreBox.tsx"
import fieldImage from "@/assets/2025_Reef_Transparent_No-Tape_Blue.png"
import * as React from "react";
import regions from "@/assets/reef_button_regions.json"

const coralLevels = ['l2', 'l3', 'l4'] as const

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
        const imageWidth = 567;
        const imageHeight = 655;

        return (
            <div className="relative w-full aspect-[567/655]">
                <img
                    src={fieldImage}
                    alt="Field"
                    className="w-full h-full object-contain pointer-events-none absolute"
                />
                <svg
                    viewBox={`0 0 ${imageWidth} ${imageHeight}`}
                    className="absolute inset-0 w-full h-full"
                >
                    {regions.map(({label, points}) => (
                        <polygon
                            key={label}
                            points={points.map(p => `${p.x},${p.y}`).join(" ")}
                            onClick={() => setSelectedBranch(label)}
                            className={`cursor-pointer ${
                                selectedBranch === label ? "fill-white/30" : "fill-transparent"
                            } stroke-white stroke-[0.5]`}
                        />
                    ))}
                    <circle
                        cx={imageWidth / 2}
                        cy={imageHeight / 2}
                        r={70}
                        onClick={() => {
                            setSelectedBranch("missed")
                            setMissedMode("inc")
                        }
                        }
                        className={`cursor-pointer ${
                            selectedBranch === "missed" ? "fill-white/30" : "fill-transparent"
                        } stroke-white stroke-[0.5]`}
                    />

                </svg>
            </div>
        );
    };


    return (
        <div className="w-screen h-max flex flex-col p-4 select-none">
            {/* Top: fixed height */}
            <div className="text-xl font-semibold">
                Auto
            </div>

            {/* Middle: expands to fill space */}
            <div className="items-center justify-center gap-6 overflow-hidden">
                <div className="flex-1 min-h-0 flex items-center justify-center w-full pb-2">
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
                                setMissedMode((prev) => (prev === "inc" ? "dec" : "inc"))
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
            </div>

            {/* Bottom: pinned to bottom by flex layout */}
            <div className="grid grid-cols-2 gap-4 pt-4">
                <ScoreBox
                    id="auto-l1"
                    label="L1"
                    value={data.auto.l1}
                    onChange={(v) => {
                        const updated = {...data.auto, l1: v, moved: true}
                        setData((prev) => ({...prev, auto: updated}))
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
                        setData((prev) => ({...prev, auto: updated}))
                    }}
                />
                <ScoreBox
                    id="auto-Processor"
                    label="Processor"
                    value={data.auto.processor}
                    onChange={(v) => {
                        const updated = {...data.auto, processor: v, moved: true}
                        setData((prev) => ({...prev, auto: updated}))
                    }}
                />
                <ScoreBox
                    id="auto-barge"
                    label="Barge"
                    value={data.auto.barge}
                    onChange={(v) => {
                        const updated = {...data.auto, barge: v, moved: true}
                        setData((prev) => ({...prev, auto: updated}))
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
                        setData((prev) => ({...prev, auto: updated}))
                    }}
                />
                <button
                    onClick={toggleMoved}
                    className={`text-sm h-full px-2 py-0.5 rounded text-white ${
                        data.auto.moved ? "bg-green-600" : "bg-red-600"
                    }`}
                >
                    LEFT START: {data.auto.moved ? "YES" : "NO"}
                </button>
            </div>
        </div>
    )
}
