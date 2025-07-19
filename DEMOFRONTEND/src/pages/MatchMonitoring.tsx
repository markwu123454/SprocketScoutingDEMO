import {useEffect, useState} from 'react'
import {useScoutingSync} from '@/contexts/useScoutingSync'
import {Badge} from '@/components/ui/badge'
import type {TeamInfo} from '@/types'

export default function MatchMonitoringLayout() {
    const {getAllStatuses, getTeamList} = useScoutingSync()
    const [teamStatuses, setTeamStatuses] = useState<
        { match: string; team: number; status: string; scouter: string | null }[]
    >([])
    const [activeOnly, setActiveOnly] = useState<
        { match: string; team: number; status: string; scouter: string | null }[]
    >([])

    const [matchNum, setMatchNum] = useState(2)
    const [matchRed, setMatchRed] = useState<TeamInfo[]>([])
    const [matchBlue, setMatchBlue] = useState<TeamInfo[]>([])

    const loadStatuses = async () => {
    const all = await getAllStatuses()
    if (!all) return

    const allTeams = []
    const active = []

    for (const match in all) {
        for (const teamStr in all[match]) {
            const { status, scouter } = all[match][teamStr]
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
        const red = await getTeamList(String(m), 'red')
        const blue = await getTeamList(String(m), 'blue')
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
        </div>
    )
}
