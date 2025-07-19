import { useEffect, useState } from 'react'
import { useScoutingSync } from '@/contexts/useScoutingSync'
import { Badge } from '@/components/ui/badge' // if using shadcn/ui or similar

export default function MatchMonitoringLayout() {
    const { getAllStatuses } = useScoutingSync()
    const [activeTeams, setActiveTeams] = useState<
        { match: string; team: number; status: string; scouter: string | null }[]
    >([])

    useEffect(() => {
        const load = async () => {
            const all = await getAllStatuses()
            if (!all) return

            const filtered = []
            for (const match in all) {
                for (const teamStr in all[match]) {
                    const { status, scouter } = all[match][teamStr]
                    if (status !== 'unclaimed' && status !== 'completed') {
                        filtered.push({
                            match,
                            team: Number(teamStr),
                            status,
                            scouter,
                        })
                    }
                }
            }
            setActiveTeams(filtered)
        }

        void load()
        const interval = setInterval(load, 2000)
        return () => clearInterval(interval)
    }, [])

    const statusColor = (status: string) => {
        switch (status) {
            case 'pre': return 'bg-yellow-700 text-yellow-100'
            case 'auto': return 'bg-blue-700 text-blue-100'
            case 'teleop': return 'bg-purple-700 text-purple-100'
            case 'post': return 'bg-green-700 text-green-100'
            default: return 'bg-zinc-600 text-white'
        }
    }

    return (
        <div className="p-4 h-screen space-y-4 bg-zinc-900">
            <h1 className="text-2xl font-bold text-white">Active Scouting</h1>
            {activeTeams.length === 0 ? (
                <p className="text-zinc-500">No active teams</p>
            ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {activeTeams.map(({ match, team, status, scouter }) => (
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
        </div>
    )
}
