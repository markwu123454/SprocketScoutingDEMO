import type {ScoutingData} from "@/types.ts";

export default function PostMatch({
                       data,
                       setData,
                   }: {
    data: ScoutingData
    setData: React.Dispatch<React.SetStateAction<ScoutingData>>
}) {
    return <div>Post-Match Screen</div>
}