import {useEffect, useState} from 'react'
import {useAPI} from '@/api/API.ts'
import {Badge} from '@/components/ui/badge'
import type {TeamInfo, UIInfo} from '@/types'
import field_overlay from '@/assets/FMS_In-Match.png'
import {defaultUIINFO} from "@/components/seasons/2025/yearConfig.ts";

export default function MatchMonitoringLayout() {
    const {getAllStatuses, getTeamList} = useAPI()
    const [teamStatuses, setTeamStatuses] = useState<
        { match: string; team: number; status: string; scouter: string | null }[]
    >([])
    const [activeOnly, setActiveOnly] = useState<
        { match: string; team: number; status: string; scouter: string | null }[]
    >([])

    const [matchNum, setMatchNum] = useState(2)
    const [matchType, setMatchType] = useState("sf")
    const [matchRed, setMatchRed] = useState<TeamInfo[]>([])
    const [matchBlue, setMatchBlue] = useState<TeamInfo[]>([])

    const [matchInfo, setMatchInfo] = useState<UIInfo>(defaultUIINFO);

    const loadStatuses = async () => {
        const all = await getAllStatuses()
        if (!all) return

        const allTeams = []
        const active = []

        for (const match in all) {
            for (const teamStr in all[match]) {
                const {status, scouter} = all[match][teamStr]
                const entry = {
                    match,
                    team: Number(teamStr),
                    status,
                    scouter,
                }

                if (status !== 'unclaimed') {
                    allTeams.push(entry)
                }

                if (status !== 'unclaimed' && status !== 'submitted') {
                    active.push(entry)
                }
            }
        }

        setTeamStatuses(allTeams) // full list
        setActiveOnly(active)     // active only
    }

    const loadTeams = async (m: number) => {
        const red = await getTeamList(m, "qm", 'red')
        const blue = await getTeamList(m, "qm", 'blue')
        setMatchRed(red)
        setMatchBlue(blue)
    }

    useEffect(() => {
        void loadStatuses()
        void loadTeams(matchNum)

        const interval = setInterval(() => {
            void loadStatuses()
        }, 2000)
        return () => clearInterval(interval)
    }, [matchNum])

    const nextMatch = () => {
        setActiveOnly((prev) =>
            prev.filter((entry) => entry.match !== String(matchNum))
        )
        setMatchNum((n) => n + 1)
    }

    const prevMatch = () => {
        setActiveOnly((prev) =>
            prev.filter((entry) => entry.match !== String(matchNum))
        )
        setMatchNum((n) => n - 1)
    }

    const statusColor = (status: string) => {
        switch (status) {
            case 'pre':
                return 'bg-yellow-700 text-yellow-100'
            case 'auto':
                return 'bg-blue-700 text-blue-100'
            case 'teleop':
                return 'bg-purple-700 text-purple-100'
            case 'post':
                return 'bg-green-700 text-green-100'
            default:
                return 'bg-zinc-600 text-white'
        }
    }

    const renderTeamStatus = (team: TeamInfo) => {
        const entry = teamStatuses.find(
            (e) => e.match === String(matchNum) && e.team === team.number
        )

        let bg = 'bg-red-700 text-red-100'
        if (entry) {
            if (entry.status === 'submitted') {
                bg = 'bg-green-700 text-green-100'
            } else {
                bg = 'bg-blue-700 text-blue-100'
            }
        }

        return (
            <div
                key={team.number}
                className={`p-3 rounded text-center text-white font-bold ${bg}`}
            >
                {team.number}
            </div>
        )
    }

    const renderfieldoverlay = () => {
        return (
            <div className="font-roboto w-full aspect-[1260/75] relative text-[1em] px-4 select-none">
                <img
                    src={field_overlay}
                    alt="Scoreboard Background"
                    className="w-full h-auto"
                />
                <div className="absolute inset-0 text-white text-sm h-full w-full">
                    {/* Top label */}
                    <div
                        className="absolute top-[1%] left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[1.4cqw]">
                        {(() => {
                            if (matchType === "qm") return `Qualification ${matchNum} of 84`
                            if (matchType === "f") return `Finals ${matchNum}`

                            if (matchType === "sf") {
                                if (matchNum <= 4) return `Upper Bracket – Round 1 – Match ${matchNum}`
                                if (matchNum <= 6) return `Lower Bracket – Round 2 – Match ${matchNum}`
                                if (matchNum <= 8) return `Upper Bracket – Round 2 – Match ${matchNum}`
                                if (matchNum <= 10) return `Lower Bracket – Round 3 – Match ${matchNum}`
                                if (matchNum === 11) return `Lower Bracket – Round 4 – Match 11`
                                if (matchNum === 12) return `Upper Bracket – Round 4 – Match 12`
                                if (matchNum === 13) return `Lower Bracket – Round 5 – Match 13`
                            }

                            return `${matchType} ${matchNum} of 84`
                        })()}
                    </div>

                    {/* Red algae count */}
                    <div className="absolute top-[50%] left-[13.6%] -translate-x-1/2 flex flex-col gap-1 text-center text-[1.6cqw]">
                        <div className="w-8">{matchInfo.red.algae}</div>
                    </div>
                    {/* Red coral count */}
                    <div className="absolute top-[50%] left-[5.8%] -translate-x-1/2 flex flex-col gap-1 text-center text-[1.6cqw]">
                        <div className="w-8">{matchInfo.red.coral}</div>
                    </div>

                    {/* Blue algae count */}
                    <div className="absolute top-[50%] right-[3.5%] -translate-x-1/2 flex flex-col gap-1 text-center text-[1.6cqw]">
                        <div className="w-8">{matchInfo.blue.algae}</div>
                    </div>
                    {/* Blue coral count */}
                    <div className="absolute top-[50%] right-[11.2%] -translate-x-1/2 flex flex-col gap-1 text-center text-[1.6cqw]">
                        <div className="w-8">{matchInfo.blue.coral}</div>
                    </div>

                    {/* Red alliance info */}
                    <div className="absolute top-[65%] left-[30%] flex gap-2 items-center text-[1cqw]">
                        <span>0</span>
                        <span>2583</span>
                        <span>2915</span>
                    </div>

                    {/* Blue alliance info */}
                    <div className="absolute top-[65%] right-[30%] flex gap-2 items-center text-[1cqw]">
                        <span>3026</span>
                        <span>1595</span>
                        <span>2048</span>
                    </div>

                    {/* Red score */}
                    <div className="absolute top-[35%] left-[43.6%] -translate-x-1/2 flex gap-2 items-center text-[3cqw]">
                        <span className="font-bold ml-2">{matchInfo.red.score}</span>
                    </div>

                    {/* Blue score */}
                    <div className="absolute top-[35%] right-[41.8%] -translate-x-1/2 flex gap-2 items-center text-[3cqw]">
                        <span className="font-bold ml-2">{matchInfo.blue.score}</span>
                    </div>
                </div>
            </div>
        )
    }


    return (
        <div className="p-4 h-screen space-y-6 bg-zinc-900 overflow-y-auto">
            <h1 className="text-2xl font-bold text-white">Active Scouting</h1>
            {activeOnly.length === 0 ? (
                <p className="text-zinc-500">No active teams</p>
            ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {activeOnly.map(({match, team, status, scouter}) => (
                        <div
                            key={`${match}-${team}`}
                            className="flex flex-col gap-1 p-3 rounded bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition"
                        >
                            <div className="text-sm text-zinc-400 font-mono">
                                Match {match} – Team {team}
                            </div>
                            <div className="flex justify-between items-center">
                                {scouter ? (
                                    <Badge className="text-sm text-zinc-300 italic">by {scouter}</Badge>
                                ) : (
                                    <Badge className="text-sm text-zinc-500">—</Badge>
                                )}
                                <Badge className={`text-xs px-2 py-1 rounded ${statusColor(status)}`}>
                                    {status.toUpperCase()}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 space-y-4 space-x-5">
                <h2 className="text-xl font-semibold text-white">Match {matchNum} Robot Claims</h2>
                <div>
                    <h3 className="text-lg text-red-400 mb-1">Red Alliance</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {matchRed.map(renderTeamStatus)}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg text-blue-400 mb-1">Blue Alliance</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {matchBlue.map(renderTeamStatus)}
                    </div>
                </div>

                <button
                    onClick={prevMatch}
                    className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                >
                    Last match
                </button>

                <button
                    onClick={nextMatch}
                    className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                >
                    Next match
                </button>
            </div>
            {renderfieldoverlay()}
        </div>
    )
}
