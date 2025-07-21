import React, { useState } from "react"
import * as Slider from "@radix-ui/react-slider"
import { HelpCircle } from "lucide-react"

/**
 * RatingSlider – Gradient slider for qualitative rating input
 *
 * Props:
 * @param value - Current value (0 to 1)
 * @param onChange - Callback when value changes
 * @param title - Optional text shown above the slider
 * @param leftLabel - Label shown under the minimum value (default: "Low")
 * @param rightLabel - Label shown under the maximum value (default: "High")
 * @param infoBox - Optional custom ReactNode to show in a floating popup
 */
export default function RatingSlider({
    value,
    onChange,
    title,
    leftLabel = "Low",
    rightLabel = "High",
    infoBox
}: {
    value: number
    onChange: (val: number) => void
    title?: string
    leftLabel?: string
    rightLabel?: string
    infoBox?: React.ReactNode
}) {
    const [showInfo, setShowInfo] = useState(false)

    const getColor = (v: number) => {
        const ratio = Math.max(0, Math.min(1, v))
        let r, g, b
        if (ratio < 0.5) {
            const t = ratio / 0.5
            r = 220 + (234 - 220) * t
            g = 38 + (179 - 38) * t
            b = 38 + (8 - 38) * t
        } else {
            const t = (ratio - 0.5) / 0.5
            r = 234 + (34 - 234) * t
            g = 179 + (197 - 179) * t
            b = 8 + (94 - 8) * t
        }
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
    }

    return (
        <div className="w-full max-w-sm px-6 py-2 mx-auto flex flex-col gap-2 relative">
            <div className="flex items-center justify-between">
                {title && <div className="text-sm font-medium text-zinc-200">{title}</div>}
                {infoBox && (
                    <button onClick={() => setShowInfo(prev => !prev)}>
                        <HelpCircle className="w-4 h-4 text-zinc-400 hover:text-white" />
                    </button>
                )}
            </div>

            {showInfo && (
                <button
                    onClick={() => setShowInfo(false)}
                    className="absolute top-0 right-0 z-10 mt-8 w-64 text-left text-xs text-zinc-300 bg-zinc-800 rounded px-3 py-2 shadow-lg"
                >
                    {infoBox}
                </button>
            )}

            <Slider.Root
                className="relative flex w-full touch-none select-none items-center"
                min={0}
                max={1}
                step={0.001}
                value={[value]}
                onValueChange={([val]) => onChange(val)}
            >
                <Slider.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-zinc-700">
                    <Slider.Range
                        className="absolute h-full"
                        style={{ backgroundColor: getColor(value) }}
                    />
                </Slider.Track>
                <Slider.Thumb
                    className="block h-5 w-5 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: getColor(value) }}
                />
            </Slider.Root>

            <div className="flex justify-between text-sm text-zinc-400 px-1">
                <span>{leftLabel}</span>
                <span>{rightLabel}</span>
            </div>
        </div>
    )
}