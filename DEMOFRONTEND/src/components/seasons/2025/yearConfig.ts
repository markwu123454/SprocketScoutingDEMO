import type { AllianceType, MatchType } from "@/types"

export type ScoutingData = {
    match: number | null
    match_type: MatchType
    alliance: AllianceType
    teamNumber: number | null
    scouter: string | null

    auto: {
        branchPlacement: Record<string, { l2: boolean; l3: boolean; l4: boolean }>
        algaePlacement: Record<string, boolean>
        missed: { l2: number; l3: number; l4: number; l1: number }
        l1: number
        processor: number
        barge: number
        missAlgae: number
        moved: boolean
    }

    teleop: {
        branchPlacement: Record<string, { l2: boolean; l3: boolean; l4: boolean }>
        algaePlacement: Record<string, boolean>
        missed: { l2: number; l3: number; l4: number; l1: number }
        l1: number
        processor: number
        barge: number
        missAlgae: number
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

export type UIInfo = {
    red: {
        score: number
        coral: number
        algae: number
    }
    blue: {
        score: number
        coral: number
        algae: number
    }
}

export const defaultScoutingData: Omit<ScoutingData, 'scouter'> = {
    match: null,
    match_type: null,
    alliance: null,
    teamNumber: null,
    auto: {
        branchPlacement: Object.fromEntries(
            "ABCDEFGHIJKL".split("").map((id) => [id, { l2: false, l3: false, l4: false }])
        ),
        algaePlacement: {
            AB: true,
            CD: true,
            EF: true,
            GH: true,
            IJ: true,
            KL: true
        },
        missed: { l1: 0, l2: 0, l3: 0, l4: 0 },
        l1: 0,
        processor: 0,
        barge: 0,
        missAlgae: 0,
        moved: false,
    },
    teleop: {
        branchPlacement: Object.fromEntries(
            "ABCDEFGHIJKL".split("").map((id) => [id, { l2: false, l3: false, l4: false }])
        ),
        algaePlacement: {
            AB: true,
            CD: true,
            EF: true,
            GH: true,
            IJ: true,
            KL: true
        },
        missed: { l1: 0, l2: 0, l3: 0, l4: 0 },
        l1: 0,
        processor: 0,
        barge: 0,
        missAlgae: 0,
    },
    postmatch: {
        skill: 0,
        climbSpeed: 0,
        climbSuccess: false,
        offense: false,
        defense: false,
        faults: {
            system: false,
            idle: false,
            other: false,
        },
        notes: '',
    },
}

export const defaultUIINFO = {
    red: {
        score: 0,
        coral: 0,
        algae: 0
    },
    blue: {
        score: 0,
        coral: 0,
        algae: 0
    }
}