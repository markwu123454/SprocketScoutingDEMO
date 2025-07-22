import type {ScoutingData} from "@/types.ts";
import ScoreBox from "@/components/ui/scoreBox.tsx";

export default function TeleopPhase({data, setData}: {
    data: ScoutingData,
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    const coralFields: (keyof ScoutingData['teleop'])[] = ['l4', 'l3', 'l2', 'l1', 'coralMissed']
    const otherFields: (keyof ScoutingData['teleop'])[] = ['reef', 'barge', 'algaeMissed']

    return (
        <div className="p-4 w-full h-full">
            <div>Tele-Op</div>
            <div className="flex">
                <div className="w-1/2 p-4 flex flex-col gap-3 border-r border-zinc-700">
                    <div className="text-lg font-semibold mb-1">Coral Scoring</div>
                    {coralFields.map((field) => (
                        <ScoreBox
                            key={field}
                            id={`teleop-${field}`}
                            label={field}
                            value={data.teleop[field]}
                            onChange={(newValue) => {
                                const updated = {
                                    ...data.teleop,
                                    [field]: newValue,
                                    moved: ['l1', 'l2', 'l3', 'l4', 'barge', 'reef'].includes(field),
                                }
                                setData(prev => ({...prev, teleop: updated}))
                            }}
                        />
                    ))}
                </div>
                <div className="w-1/2 p-4 flex flex-col gap-3 border-r border-zinc-700">
                    <div className="text-lg font-semibold mb-1">Algae Scoring</div>
                    {otherFields.map((field) => (
                        <ScoreBox
                            key={field}
                            id={`teleop-${field}`}
                            label={field}
                            value={data.teleop[field]}
                            onChange={(newValue) => {
                                const updated = {
                                    ...data.teleop,
                                    [field]: newValue,
                                    moved: ['l1', 'l2', 'l3', 'l4', 'barge', 'reef'].includes(field),
                                }
                                setData(prev => ({...prev, teleop: updated}))
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}