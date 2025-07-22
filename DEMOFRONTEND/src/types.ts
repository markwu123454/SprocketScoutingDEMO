//type ClimbType = 'none' | 'park' | 'shallow' | 'deep'
//type IntakeType = 'none' | 'ground' | 'station' | 'both'
export type MatchType = 'qm' | 'sf' | 'f'
export type AllianceType = 'red' | 'blue' | null

export type ScoutingData = {
    match: number | null
    match_type: MatchType
    alliance: AllianceType
    teamNumber: number | null
    scouter: string | null

    auto: {
        branchPlacement: {
            [branchId: string]: {
                l2: boolean
                l3: boolean
                l4: boolean
            }
        }

        missed: { l2: number; l3: number; l4: number; l1: number }
        l1: number
        reef: number
        barge: number
        missAlgae: number
        moved: boolean
    }

    teleop: {
        l1: number
        l2: number
        l3: number
        l4: number
        coralMissed: number
        reef: number
        barge: number
        algaeMissed: number
    }

    postmatch: {
        skill: number
        climbSpeed: number
        climbSuccess: boolean
        offense: boolean
        defense: boolean
        faults: {
            system: boolean
            idle: boolean
            other: boolean
        }
        notes: string
    }
}

export type Phase = 'pre' | 'auto' | 'teleop' | 'post'

export type TeamInfo = {
    number: number
    name: string
    logo: string
}