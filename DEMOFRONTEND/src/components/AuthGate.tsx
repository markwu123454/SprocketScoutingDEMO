import React, {useEffect, useState} from "react"
import {useNavigate} from "react-router-dom"
import {useAPI} from "@/api/API.ts"
import {useClientEnvironment} from "@/hooks/useClientEnvironment.ts"

const PERMISSION_LABELS: Record<string, string> = {
    dev: "Developer",
    admin: "Administrator",
    match_scouting: "Match Scouting",
    pit_scouting: "Pit Scouting",
}

export default function AuthGate({
    permission,
    children,
}: {
    permission: "dev" | "admin" | "match_scouting" | "pit_scouting"
    children: React.ReactNode
}) {
    const [authorized, setAuthorized] = useState<boolean | null>(null)
    const navigate = useNavigate()
    const {verify} = useAPI()
    const {isOnline, serverOnline} = useClientEnvironment()

    useEffect(() => {
        const check = async () => {
            // Allow offline access for match/pit scouting
            if ((!isOnline || !serverOnline) && (permission === "match_scouting" || permission === "pit_scouting")) {
                setAuthorized(true)
                return
            }

            const result = await verify()
            const perms = result.permissions as Partial<Record<typeof permission, boolean>>
            const allowed = result.success && !!perms[permission]

            setAuthorized(allowed)
        }

        void check()
    }, [permission, isOnline, serverOnline, verify])

    if (authorized === null) {
        return (
            <div className="w-screen h-screen bg-zinc-950 text-white flex items-center justify-center">
                <div>Checking access…</div>
            </div>
        )
    }

    if (!authorized) {
        return (
            <div className="w-screen h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
                <div className="bg-zinc-800 rounded-xl p-8 text-center max-w-sm shadow-xl border border-zinc-700">
                    <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
                    <p className="mb-6">
                        You lack <span className="font-semibold text-red-400">{PERMISSION_LABELS[permission]}</span> permission or your
                        session expired.
                    </p>
                    <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-700 transition"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        )
    }

    return <div>{children}</div>
}
