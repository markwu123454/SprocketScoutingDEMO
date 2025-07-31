import type {
    MatchScoutingData as MatchScoutingData2025,
    PitScoutingData as PitScoutingData2025,
    UIInfo as UIInfo2025
} from "@/components/seasons/2025/yearConfig.ts"

export type MatchType = 'qm' | 'sf' | 'f' | null
export type AllianceType = 'red' | 'blue' | null

export type MatchScoutingData = MatchScoutingData2025
export type PitScoutingData = PitScoutingData2025
export type UIInfo = UIInfo2025

// TODO: maybe merge phase and scouting status?
export type Phase = 'pre' | 'auto' | 'teleop' | 'post'

export type ScoutingStatus = 'pre' | 'auto' | 'teleop' | 'post' | 'completed' | 'submitted'

export type TeamInfo = {
    number: number
    name: string
    logo: string
}
