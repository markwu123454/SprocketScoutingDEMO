// components/ui/loadButton.tsx
import React from "react"
import { Button } from "@/components/ui/button" // Or replace with raw <button> if needed


/**
 * LoadButton – A reusable button component with a built-in loading spinner.
 *
 * Props:
 * @param loading – Whether the button should show a loading animation and disable interaction.
 * @param onClick – Callback function when the button is clicked.
 * @param disabled – Optional additional disabled condition (merged with `loading`).
 * @param children – Button label or elements to show when not loading.
 */
export default function LoadButton({
    loading,
    onClick,
    disabled,
    children,
}: {
    loading: boolean
    onClick: () => void
    disabled?: boolean
    children: React.ReactNode
}) {
    return (
        <Button onClick={onClick} disabled={disabled || loading}>
            {loading ? (
                <div className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full"/>
                    Submitting...
                </div>
            ) : (
                children
            )}
        </Button>
    )
}
