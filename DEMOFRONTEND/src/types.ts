import type { ScoutingData as ScoutingData2025 } from "@/components/2025/default"

export type MatchType = 'qm' | 'sf' | 'f' | null
export type AllianceType = 'red' | 'blue' | null

export type ScoutingData = ScoutingData2025

export type Phase = 'pre' | 'auto' | 'teleop' | 'post'

export type TeamInfo = {
    number: number
    name: string
    logo: string
}