import {useEffect, useRef, useState} from "react"
import {useNavigate} from "react-router-dom"
import {useAPI} from "@/api/API.ts"
import {Eye, EyeOff} from "lucide-react"
import TooltipButton from "@/components/ui/tooltipButton"
import {useClientEnvironment} from "@/hooks/useClientEnvironment.ts"

import logo_animation from "@/assets/2026_logo_animation.gif"

export function HomeLayout() {
    const {login, verify} = useAPI()
    const {isOnline, serverOnline} = useClientEnvironment()

    const [passphrase, setPassphrase] = useState("")
    const [name, setName] = useState<string | null>(null)
    const [lastPassphrase, setLastPassphrase] = useState<string | null>(null)
    const [permissions, setPermissions] = useState<{
        dev: boolean
        admin: boolean
        match_scouting: boolean
        pit_scouting: boolean
    } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [messageIndex, setMessageIndex] = useState<number | null>(null)
    const [showPassphrase, setShowPassphrase] = useState(false)
    const [loginConfirmed, setLoginConfirmed] = useState(false)

    const greetings = [
        `Welcome, ${name}, to FIRST Age.`,
        `Logged in as ${name}.`,
        `Session active for ${name}.`,
        `Authenticated. Good to have you back, ${name}.`,
        `Scouting interface ready for ${name}.`,
    ]

    const privilegeButtons = [
        {label: "Control", key: "dev", path: "/dev"},
        {label: "Admin Panel & Data", key: "admin", path: "/admin"},
        {label: "Match Scouting", key: "match_scouting", path: "/scouting/match"},
        {label: "Pit Scouting", key: "pit_scouting", path: "/scouting/pit"},
    ]

    const navigate = useNavigate()

    const inputRef = useRef<HTMLInputElement>(null)

    const tempPassphraseRef = useRef("")

    useEffect(() => {
        const load = async () => {
            const result = await verify()
            if (result.success && result.name && result.permissions) {
                setName(result.name)
                setPermissions(result.permissions)
                setMessageIndex(Math.floor(Math.random() * greetings.length))
                setLoginConfirmed(true)
                setLastPassphrase("") // optionally blank to not reset from input
            }
        }
        void load()
    }, [])

    // Required to check for autofill behavior
    useEffect(() => {
        const checkInterval = setInterval(() => {
            const currentValue = inputRef.current?.value || ""
            const lastValue = tempPassphraseRef.current

            if (currentValue !== lastValue) {
                setLoginConfirmed(false)
                tempPassphraseRef.current = currentValue
            }
        }, 500)

        return () => clearInterval(checkInterval)
    }, [])

    const handleCheck = async () => {
        const result = await login(passphrase)
        if (result.success && result.name && result.permissions) {
            setName(result.name)
            setPermissions(result.permissions)
            setError(null)
            setLoginConfirmed(true)
            setLastPassphrase(passphrase)

            if (passphrase !== lastPassphrase) {
                setMessageIndex(Math.floor(Math.random() * greetings.length))
            }
        } else {
            setName(null)
            setPermissions(null)
            setError(result.error ?? "Login failed")
            setLoginConfirmed(false)
        }
    }

    const handleNavigate = (path: string | null) => {
        if (path) navigate(path)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleCheck()
    }

    return (
        <>
            <div className="relative min-h-screen text-white flex items-center justify-center px-4 touch-none
                    bg-[url('@/assets/2026_background_expanded.png')] bg-top bg-cover w-full">

                {/* Top-left GIF */}
                <img src={logo_animation} alt="logo animation"
                     className="absolute top-2 left-4 h-30 pointer-events-none"/>

                {/* Centered content */}
                <div
                    className="w-full max-w-md bg-zinc-950/70 p-6 rounded-lg shadow-lg space-y-6 border border-zinc-800">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold">Login</h1>
                        <p className="text-sm text-zinc-400">Enter your passphrase to continue</p>
                    </div>

                    <div className="relative">
                        <input
                            ref={inputRef}
                            type={showPassphrase ? "text" : "password"}
                            value={passphrase}
                            onChange={(e) => {
                                setPassphrase(e.target.value)
                                if (passphrase !== lastPassphrase) {
                                    setLoginConfirmed(false)
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Passphrase"
                            className="w-full pr-10 p-2 rounded bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassphrase(prev => !prev)}
                            className="absolute inset-y-0 right-0 px-4 flex items-center justify-center text-zinc-400 hover:text-white"
                        >
                            {showPassphrase ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                        </button>

                    </div>
                    {isOnline && serverOnline ? (
                        <button
                            onClick={handleCheck}
                            disabled={loginConfirmed}
                            className={`w-full py-2 transition rounded font-semibold ${
                                loginConfirmed
                                    ? "bg-green-600 text-white cursor-default"
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                        >
                            {loginConfirmed ? "Logged In" : "Login"}
                        </button>
                    ) : (
                        <button
                            disabled={true}
                            className={`w-full py-2 transition rounded font-semibold bg-zinc-900 text-white cursor-not-allowed`}
                        >
                            {!isOnline ? "Device Offline" : "Server Offline"}
                        </button>
                    )}
                    {isOnline && serverOnline && (
                        <>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            {name && (
                                <p className="text-sm text-zinc-400">
                                    {greetings[messageIndex!]}
                                </p>
                            )}
                        </>
                    )}


                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500">Available Options</p>
                        <div className="grid grid-cols-1 gap-3">
                            {privilegeButtons.map(({label, key, path}) => {
                                const isScoutingPage = key === "match_scouting" || key === "pit_scouting"
                                const isRestrictedOffline = key === "dev" || key === "admin"
                                const offline = !isOnline || !serverOnline

                                const tooltips: Record<string, string> = {
                                    dev_allow: "Developer tools and control systems are available.",
                                    dev_forbid: "Developer tools are not available for this account.",
                                    dev_offline: "Developer tools are unavailable in offline mode.",

                                    admin_allow: "Admin panel and full scouting data are available.",
                                    admin_forbid: "Admin access is not enabled for this account.",
                                    admin_offline: "Admin panel is unavailable in offline mode.",

                                    match_scouting_allow: "Match scouting is available.",
                                    match_scouting_forbid: "Match scouting is not permitted for this account.",
                                    match_scouting_offline: "Match scouting is available in offline mode.",

                                    pit_scouting_allow: "Pit scouting is available.",
                                    pit_scouting_forbid: "Pit scouting is not permitted for this account.",
                                    pit_scouting_offline: "Pit scouting is available in offline mode.",
                                }


                                let tooltipKey: string
                                let enabled: boolean

                                if (isScoutingPage && offline) {
                                    tooltipKey = `${key}_offline`
                                    enabled = true
                                } else if (isRestrictedOffline && offline) {
                                    tooltipKey = `${key}_offline`
                                    enabled = false
                                } else {
                                    const hasPermission = permissions?.[key as keyof typeof permissions] ?? false
                                    tooltipKey = `${key}_${hasPermission ? "allow" : "forbid"}`
                                    enabled = hasPermission
                                }

                                return (
                                    <TooltipButton
                                        key={key}
                                        label={label}
                                        disabled={!enabled}
                                        tooltip={tooltips[tooltipKey]}
                                        onClick={() => handleNavigate(path)}
                                    />
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
