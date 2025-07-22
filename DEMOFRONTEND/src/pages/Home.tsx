import {useEffect, useRef, useState} from "react"
import {useNavigate} from "react-router-dom"
import {useScoutingSync} from "@/contexts/useScoutingSync"
import {Eye, EyeOff} from "lucide-react"

export default function HomeLayout() {
    const {login, verify} = useScoutingSync()
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
        `Welcome, ${name}, to Orange County Regionals.`,
        `Logged in as ${name}.`,
        `Session active for ${name}.`,
        `Authenticated. Good to have you back, ${name}.`,
        `Scouting interface ready for ${name}.`,

        `Welcome, ${name}, to Orange County Regionals.`,
        `Logged in as ${name}.`,
        `Session active for ${name}.`,
        `Authenticated. Good to have you back, ${name}.`,
        `Scouting interface ready for ${name}.`,

        `Welcome, ${name}, to Orange County Regionals.`,
        `Logged in as ${name}.`,
        `Session active for ${name}.`,
        `Authenticated. Good to have you back, ${name}.`,
        `Scouting interface ready for ${name}.`,

        `HIIIIIIII, ${name}, I'VE BEEN CODING NON-STOP FOR 2 MONTH, HELP.`,
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

    const privilegeButtons = [
        {label: "Control", key: "dev", path: "/dev"},
        {label: "Admin Panel & Data", key: "admin", path: "/admin"},
        {label: "Match Scouting", key: "match_scouting", path: "/scouting/match"},
        {label: "Pit Scouting", key: "pit_scouting", path: "/scouting/pit"},
    ]

    return (
        <div className="min-h-screen bg-zinc-900 text-white flex items-center justify-center px-4 touch-none">
            <div className="w-full max-w-md bg-zinc-950 p-6 rounded-lg shadow-lg space-y-6 border border-zinc-800">
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


                {error && <p className="text-red-500 text-sm">{error}</p>}
                {name && (
                    <p className="text-sm text-zinc-400">
                        {greetings[messageIndex!]}
                    </p>
                )}

                <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <p className="text-sm text-zinc-500">Available Options</p>
                    <div className="grid grid-cols-1 gap-3">
                        {privilegeButtons.map(({label, key, path}) => {
                            const enabled = permissions?.[key as keyof typeof permissions] ?? false
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleNavigate(path)}
                                    disabled={!enabled}
                                    className={`w-full py-2 rounded font-medium transition ${
                                        enabled
                                            ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                    }`}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>

    )
}
