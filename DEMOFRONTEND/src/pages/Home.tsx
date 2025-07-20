// Home.tsx
import {useState} from "react"
import {useNavigate} from "react-router-dom"

export default function HomeLayout() {
    const [passphrase, setPassphrase] = useState("")
    const [isValid, setIsValid] = useState(false)
    const navigate = useNavigate()

    const privileges = {
        dataAccess: false,
        adminPanel: false,
        matchScouting: true,
        pitScouting: true,
    }

    const handleCheck = () => {
        // Dummy validation logic
        setIsValid(passphrase.trim().length > 0)
    }

    const handleNavigate = (path: string | null) => {
        if (path) navigate(path)
    }

    const privilegeButtons = [
        {
            label: "Scouting Data",
            key: "dataAccess",
            path: null,
        },
        {
            label: "Admin Panel",
            key: "adminPanel",
            path: "/admin",
        },
        {
            label: "Match Scouting",
            key: "matchScouting",
            path: "/scouting/match",
        },
        {
            label: "Pit Scouting",
            key: "pitScouting",
            path: "/scouting/pit",
        },
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
                        placeholder="Passphrase"
                        className="w-full p-2 rounded bg-zinc-800 text-white placeholder-zinc-500 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                        onClick={handleCheck}
                        className="w-full py-2 bg-blue-700 hover:bg-blue-800 transition rounded text-white font-semibold"
                    >
                        Check Passphrase
                    </button>
                </div>

                {isValid && (
                    <div className="grid grid-cols-1 gap-3">
                        {privilegeButtons.map(({label, key, path}) => (
                            <button
                                key={key}
                                onClick={() => handleNavigate(path)}
                                disabled={!privileges[key as keyof typeof privileges]}
                                className={`w-full py-2 rounded font-medium transition ${
                                    privileges[key as keyof typeof privileges]
                                        ? "bg-green-700 hover:bg-green-800 cursor-pointer"
                                        : "bg-zinc-700 opacity-50 cursor-not-allowed"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
