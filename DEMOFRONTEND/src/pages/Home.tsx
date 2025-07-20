import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useScoutingSync } from "@/contexts/useScoutingSync"


export default function HomeLayout() {
    const { login, verify } = useScoutingSync()
    const [passphrase, setPassphrase] = useState("")
    const [isValid, setIsValid] = useState(false)
    const [name, setName] = useState<string | null>(null)
    const [permissions, setPermissions] = useState<{
        dev: boolean
        admin: boolean
        match_scouting: boolean
        pit_scouting: boolean
    } | null>(null)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()

    useEffect(() => {
        const load = async () => {
            const result = await verify()
            if (result.success && result.name && result.permissions) {
                setIsValid(true)
                setName(result.name)
                setPermissions(result.permissions)
            }
        }
        void load()
    }, [])

    const handleCheck = async () => {
        const result = await login(passphrase)
        if (result.success && result.name && result.permissions) {
            setIsValid(true)
            setName(result.name)
            setPermissions(result.permissions)
            setError(null)
        } else {
            setIsValid(false)
            setName(null)
            setPermissions(null)
            setError(result.error ?? "Login failed")
        }
    }

    const handleNavigate = (path: string | null) => {
        if (path) navigate(path)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleCheck()
    }

    const privilegeButtons = [
        { label: "Control", key: "dev", path: "/dev" },
        { label: "Admin Panel & Data", key: "admin", path: "/admin" },
        { label: "Match Scouting", key: "match_scouting", path: "/scouting/match" },
        { label: "Pit Scouting", key: "pit_scouting", path: "/scouting/pit" },
    ]

    return (
        <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md space-y-6">
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold">Enter Passphrase</h1>
                    <input
                        type="text"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Passphrase"
                        className="w-full p-2 rounded bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                        onClick={handleCheck}
                        className="w-full py-2 bg-blue-700 hover:bg-blue-800 transition rounded text-white font-semibold"
                    >
                        Check Passphrase
                    </button>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>

                {(isValid && permissions) && (
                    <div className="space-y-2">
                        <p className="text-sm text-zinc-400">
                            Logged in as: <span className="font-medium">{name}</span>
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            {privilegeButtons.map(({ label, key, path }) => {
                                const enabled = permissions[key as keyof typeof permissions]
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleNavigate(path)}
                                        disabled={!enabled}
                                        className={`w-full py-2 rounded font-medium transition ${
                                            enabled
                                                ? "bg-green-700 hover:bg-green-800 cursor-pointer"
                                                : "bg-zinc-700 opacity-50 cursor-not-allowed"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}