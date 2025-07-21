// components/ui/loadButton.tsx
import React from "react"
import { Button } from "@/components/ui/button"

interface LoadButtonProps {
    loading: boolean
    onClick: () => void
    disabled?: boolean
    className?: string
    children: React.ReactNode
}

export default function LoadButton({
    loading,
    onClick,
    disabled,
    className = "",
    children,
}: LoadButtonProps) {
    return (
        <Button
            onClick={onClick}
            disabled={disabled || loading}
            className={className}
        >
            {loading ? (
                <div className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-white rounded-full" />
                    Submitting...
                </div>
            ) : (
                children
            )}
        </Button>
    )
}
