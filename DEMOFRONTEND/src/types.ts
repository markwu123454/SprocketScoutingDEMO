type ClimbType = 'none' | 'park' | 'shallow' | 'deep'
type IntakeType = 'none' | 'ground' | 'station' | 'both'

export type ScoutingData = {
    match: string
    alliance: 'red' | 'blue' | null
    teamNumber: number | null

    auto: {
        l1: number
        l2: number
        l3: number
        l4: number
        missed: number
        reef: number
        barge: number
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

    endgame: {
        climb: ClimbType
        success: boolean
    }

    postmatch: {
        intake: IntakeType
    }
}

export type Phase = 'pre' | 'auto' | 'teleop' | 'post'

export type TeamInfo = {
    number: number
    name: string
    logo: string
}