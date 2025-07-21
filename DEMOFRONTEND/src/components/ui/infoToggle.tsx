import { useState } from "react"
import { HelpCircle } from "lucide-react"

export default function InfoToggle({
    value,
    onToggle,
    label,
    infoBox,
    trueLabel = "Yes",
    falseLabel = "No"
}: {
    value: boolean
    onToggle: () => void
    label: string
    infoBox?: React.ReactNode
    trueLabel?: string
    falseLabel?: string
}) {
    const [showInfo, setShowInfo] = useState(false)

    return (
        <div className="relative w-fit">
            {showInfo && (
                <div
                    onClick={() => setShowInfo(false)}
                    className="absolute -top-20 left-1/2 -translate-x-1/2 z-10 w-64 text-xs text-zinc-300 bg-zinc-800 rounded px-3 py-2 shadow-lg"
                >
                    {infoBox}
                </div>
            )}

            <button
                onClick={onToggle}
                className={`flex items-center justify-center gap-1 px-2 py-1 rounded text-sm w-28 ${
                    value ? "bg-green-600" : "bg-red-600"
                }`}
            >
                <span className="truncate">{label}: {value ? trueLabel : falseLabel}</span>
                {infoBox && (
                    <HelpCircle
                        className="w-4 h-4 text-zinc-200 hover:text-white"
                        onClick={(e) => {
                            e.stopPropagation()
                            setShowInfo(prev => !prev)
                        }}
                    />
                )}
            </button>
        </div>
    )
}
