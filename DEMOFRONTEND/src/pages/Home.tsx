import {useEffect, useRef, useState} from "react"
import {useNavigate} from "react-router-dom"
import {useAPI} from "@/api/API.ts"
import {Eye, EyeOff} from "lucide-react"
import TooltipButton from "@/components/ui/tooltipButton"
import {useClientEnvironment} from "@/hooks/useClientEnvironment.ts"
import {getSetting, getSettingSync, type Settings} from "@/db/settingsDb.ts"

import logo_animation_2025 from "@/assets/2025_logo_animation.gif"
import logo_animation_2026 from "@/assets/2026_logo_animation.gif"

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
    const [theme, setTheme] = useState<Settings["theme"]>(
        () => getSettingSync("theme", "2026")
    )

    useEffect(() => {
        void (async () => {
            const t = await getSetting("theme")
            if (t) setTheme(t)
        })()
    }, [])


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
        {label: "Settings", key: "settings", path: "/setting"}, // NEW
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
                setLastPassphrase("")
            }
        }
        void load()
    }, [])

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
            if (passphrase !== lastPassphrase)
                setMessageIndex(Math.floor(Math.random() * greetings.length))
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
        <div
            className="relative min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-500">

            <div
                className="
      absolute inset-0 bg-top bg-cover transition-colors duration-500
      theme-light:bg-zinc-100
      theme-dark:bg-zinc-950
      theme-2025:bg-[url('@/assets/backgrounds/2025_expanded.png')]
      theme-2026:bg-[url('@/assets/backgrounds/2026_expanded.png')]
    "
            />

            {/* --- Logo --- */}
            {(theme === "2025" || theme === "2026") && (
                <img
                    src={theme === "2025" ? logo_animation_2025 : logo_animation_2026}
                    alt="logo animation"
                    className="absolute top-2 left-4 h-20 pointer-events-none z-10"
                />
            )}

            {/* --- Foreground (Login box) --- */}
            <div
                className={`
                relative z-10 w-full max-w-md mx-10 p-6 rounded-lg shadow-lg space-y-6 border transition-colors duration-500 backdrop-blur-sm
                ${theme === "dark" ? "bg-zinc-950/70 border-zinc-800 text-white" : ""}
                ${theme === "light" ? "bg-white border-zinc-300 text-zinc-900" : ""}
                ${theme === "2025" ? "bg-[#0b234f]/70 border-[#1b3d80] text-white" : ""}
                ${theme === "2026" ? "bg-[#fef7dc]/80 border-[#e6ddae] text-[#3b2d00]" : ""}
            `}
            >
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold">Login</h1>
                    <p
                        className={`
                        text-sm
                        ${theme === "2026" ? "text-[#5a4800]" : "text-zinc-400"}
                    `}
                    >
                        Enter your passphrase to continue
                    </p>
                </div>

                <div className="relative">
                    <input
                        ref={inputRef}
                        type={showPassphrase ? "text" : "password"}
                        value={passphrase}
                        onChange={(e) => {
                            setPassphrase(e.target.value)
                            if (passphrase !== lastPassphrase) setLoginConfirmed(false)
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Passphrase"
                        className={`
                        w-full pr-10 p-2 rounded border focus:outline-none focus:ring-2 transition
                        ${theme === "dark" ? "bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-blue-600" : ""}
                        ${theme === "light" ? "bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-blue-600" : ""}
                        ${theme === "2025" ? "bg-[#102b6a]/80 border-[#2146a1] text-white placeholder-zinc-300 focus:ring-[#4d75d9]" : ""}
                        ${theme === "2026" ? "bg-[#fff8e5] border-[#d7cfa3] text-[#3b2d00] placeholder-[#7b6a2f] focus:ring-[#e3dcb4]" : ""}
                    `}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassphrase((prev) => !prev)}
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
                                : theme === "2026"
                                    ? "bg-[#e3dcb4] text-[#3b2d00] hover:bg-[#d6ca8e]"
                                    : "bg-blue-600 hover:bg-blue-500 text-white"
                        }`}
                    >
                        {loginConfirmed ? "Logged In" : "Login"}
                    </button>
                ) : (
                    <button
                        disabled
                        className="w-full py-2 rounded font-semibold bg-zinc-900 text-white cursor-not-allowed"
                    >
                        {!isOnline ? "Device Offline" : "Server Offline"}
                    </button>
                )}

                {isOnline && serverOnline && (
                    <>
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {name && (
                            <p
                                className={`
                                text-sm transition
                                ${theme === "2026" ? "text-[#5a4800]" : "text-zinc-400"}
                            `}
                            >
                                {greetings[messageIndex!]}
                            </p>
                        )}
                    </>
                )}

                <div
                    className={`
        space-y-2 pt-2 border-t transition-colors duration-500
        ${theme === "dark" ? "border-zinc-800" : ""}
        ${theme === "light" ? "border-zinc-300" : ""}
        ${theme === "2025" ? "border-[#1b3d80]" : ""}
        ${theme === "2026" ? "border-[#e6ddae]" : ""}
    `}
                >
                    <p
                        className={`
            text-sm transition-colors duration-500
            ${theme === "dark" ? "text-zinc-500" : ""}
            ${theme === "light" ? "text-zinc-600" : ""}
            ${theme === "2025" ? "text-zinc-300" : ""}
            ${theme === "2026" ? "text-[#5a4800]" : ""}
        `}
                    >
                        Available Options
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        {privilegeButtons.map(({label, key, path}) => {
                            if (key === "settings") {
                                return (
                                    <TooltipButton
                                        key={key}
                                        label={label}
                                        tooltip="Open app settings."
                                        onClick={() => handleNavigate(path)}
                                        disabled={false}
                                        className={`
                            ${theme === "dark" ? "bg-zinc-700 hover:bg-zinc-600 text-white" : ""}
                            ${theme === "light" ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-900" : ""}
                            ${theme === "2025" ? "bg-[#102b6a]/80 hover:bg-[#1d3d7d] text-white" : ""}
                            ${theme === "2026" ? "bg-[#fff8e5] hover:bg-[#f7edcc] text-[#3b2d00]" : ""}
                        `}
                                        overrideClass
                                    />
                                )
                            }

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
                                    className={`
                        ${theme === "dark"
                                        ? enabled
                                            ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        : ""}
                        ${theme === "light"
                                        ? enabled
                                            ? "bg-zinc-100 hover:bg-zinc-200 text-zinc-900"
                                            : "bg-zinc-50 text-zinc-400 cursor-not-allowed"
                                        : ""}
                        ${theme === "2025"
                                        ? enabled
                                            ? "bg-[#102b6a]/80 hover:bg-[#1d3d7d] text-white"
                                            : "bg-[#0b234f]/70 text-zinc-400 cursor-not-allowed"
                                        : ""}
                        ${theme === "2026"
                                        ? enabled
                                            ? "bg-[#fff8e5] hover:bg-[#f7edcc] text-[#3b2d00]"
                                            : "bg-[#fef7dc]/80 text-[#a19258] cursor-not-allowed"
                                        : ""}
                    `}
                                    overrideClass
                                />
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
