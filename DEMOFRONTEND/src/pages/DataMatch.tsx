import React, {useMemo, useState} from "react"
import {Navigate, useParams} from "react-router-dom"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import type {MatchAllianceData} from "@/types";
import {CircleArrowUp, CircleArrowDown, CircleEqual} from "lucide-react"

const TEMPDATA: MatchAllianceData = {
    scheduledTime: 1754358600000,

    red: {
        teams: [1690, 4414, 118],
        AIPredictedScore: 128,
        HeuristicPredictedScore: 120,
        actualScore: 127,
        calculatedScore: 127,
        teamData: {
            1690: {
                summary: [
                    {label: "Auton", summary: 20, reliability: 88, unit: "pt"},
                    {label: "Coral", summary: 7.1, reliability: 83, unit: "cycles"},
                    {label: "Algae", summary: 2.5, reliability: 60, unit: "cycles"},
                    {label: "Climb", summary: 4, reliability: 99, unit: "pt"},
                ],
                capabilities: [
                    {label: "Ground Intake", enabled: "yes"},
                    {label: "Station Intake", enabled: "yes"},
                    {label: "Full Auto", enabled: "yes"},
                    {label: "4 Piece Auto", enabled: "yes"},
                    {label: "Defense", enabled: "no"},
                    {label: "Deep Climb", enabled: "yes"},
                    {label: "Barge Scoring", enabled: "no"},
                    {label: "Algae Ground Intake", enabled: "yes"},
                    {label: "L4 Coral", enabled: "yes"},
                ],
                rankings: [
                    {label: "Auton", rank: 4, percentile: 5},
                    {label: "Coral", rank: 10, percentile: 15},
                    {label: "Algae", rank: 16, percentile: 45},
                    {label: "Climb", rank: 3, percentile: 6},
                    {label: "Defense"},
                ],
                matches: [
                    {
                        match: "Q15", result: "W", score: 126, pred_ai: 120, pred_heur: 115, pred_elo: 122,
                        teammates: [973, 1690, 1323], opponents: [254, 118, 192],
                    },
                    {
                        match: "Q08", result: "W", score: 110, pred_ai: 112, pred_heur: 108, pred_elo: 110,
                        teammates: [1323, 1690, 2910], opponents: [973, 4414, 1678],
                    },
                ],
                metrics: {
                    auto: 18,
                    teleop_coral: 56,
                    teleop_algae: 12,
                    climb: 12,
                    auto_reliability: 6,
                },
                scoring: {
                    auto: 56, teleop_coral: 68, teleop_algae: 4, endgame: 12
                },
            },

            4414: {
                rank: 4,
                logoUrl: "/logos/111.png",
                nickname: "HighTide",
                capabilities: [
                    {label: "Ground Intake", enabled: "yes"},
                    {label: "Station Intake", enabled: "yes"},
                    {label: "Full Auto", enabled: "yes"},
                    {label: "4 Piece Auto", enabled: "not demonstrated"},
                    {label: "Defense", enabled: "not demonstrated"},
                    {label: "Deep Climb", enabled: "no"},
                    {label: "Barge Scoring", enabled: "yes"},
                    {label: "Algae Ground Intake", enabled: "no"},
                    {label: "L4 Coral", enabled: "yes"},
                ],
                rankings: [
                    {label: "Auton", rank: 3, percentile: 4},
                    {label: "Coral", rank: 5, percentile: 8},
                    {label: "Algae", rank: 12, percentile: 34},
                    {label: "Climb", rank: 10, percentile: 16},
                    {label: "Defense"},
                ],
                matches: [
                    {
                        match: "Q25",
                        result: "W",
                        score: 132,
                        pred_ai: 128,
                        pred_heur: 120, pred_elo: 122,
                        teammates: [254, 973, 4414],
                        opponents: [1678, 118, 2910],
                    },
                    {
                        match: "Q25",
                        result: "W",
                        score: 132,
                        pred_ai: 128,
                        pred_heur: 120, pred_elo: 122,
                        teammates: [254, 973, 4414],
                        opponents: [1678, 118, 2910],
                    },
                    {
                        match: "Q25",
                        result: "W",
                        score: 132,
                        pred_ai: 128,
                        pred_heur: 120, pred_elo: 122,
                        teammates: [254, 973, 4414],
                        opponents: [1678, 118, 2910],
                    },
                    {
                        match: "Q25",
                        result: "W",
                        score: 132,
                        pred_ai: 128,
                        pred_heur: 120, pred_elo: 122,
                        teammates: [254, 973, 4414],
                        opponents: [1678, 118, 2910],
                    },
                    {
                        match: "Q25",
                        result: "W",
                        score: 132,
                        pred_ai: 128,
                        pred_heur: 120, pred_elo: 122,
                        teammates: [254, 973, 4414],
                        opponents: [1678, 118, 2910],
                    },
                    {
                        match: "Q18",
                        result: "L",
                        score: 86,
                        pred_ai: 94,
                        pred_heur: 86, pred_elo: 96,
                        teammates: [973, 1323, 4414],
                        opponents: [2910, 1671, 192],
                    },
                    {
                        match: "Q12",
                        result: "W",
                        score: 115,
                        pred_ai: 110,
                        pred_heur: 102, pred_elo: 114,
                        teammates: [973, 1678, 4414],
                        opponents: [254, 118, 192],
                    },
                ],
                metrics: {
                    auto: 48,
                    teleop_coral: 100,
                    teleop_algae: 8,
                    climb: 7,
                    auto_reliability: 2,
                },
                scoring: {
                    auto: 38, teleop_coral: 54, teleop_algae: 16, endgame: 6
                },
            },

            118: {
                rank: 7,
                logoUrl: "/logos/118.png",
                nickname: "Robonauts",
                summary: [
                    {label: "Auton", summary: 17, reliability: 91, unit: "pt"},
                    {label: "Coral", summary: 6.9, reliability: 83, unit: "cycles"},
                    {label: "Algae", summary: 3.3, reliability: 78, unit: "cycles"},
                    {label: "Climb", summary: 5.5, reliability: 84, unit: "pt"},
                ],
                rankings: [
                    {label: "Auton", rank: 6, percentile: 12},
                    {label: "Coral", rank: 8, percentile: 20},
                    {label: "Algae", rank: 9, percentile: 30},
                    {label: "Climb", rank: 5, percentile: 18},
                    {label: "Defense", rank: 7, percentile: 12},
                ],
                matches: [
                    {
                        match: "Q14", result: "W", score: 121, pred_ai: 119, pred_heur: 116, pred_elo: 100,
                        teammates: [118, 1323, 4414], opponents: [254, 973, 1671],
                    },
                    {
                        match: "Q09", result: "L", score: 98, pred_ai: 100, pred_heur: 92, pred_elo: 122,
                        teammates: [118, 1678, 192], opponents: [2910, 973, 1690],
                    },
                ],
                metrics: {
                    auto: 16,
                    teleop_coral: 143,
                    teleop_algae: 16,
                    climb: 7,
                    auto_reliability: 5,
                },
                scoring: {
                    auto: 36, teleop_coral: 65, teleop_algae: 8, endgame: 6
                },
            },
        },
    },

    blue: {
        teams: [2910, 1323, 254],
        AIPredictedScore: 110,
        HeuristicPredictedScore: 129,
        actualScore: 118,
        calculatedScore: 109,
        teamData: {
            2910: {
                rank: 1,
                logoUrl: "/logos/2910.png",
                nickname: "Jack in the Bot",
                summary: [
                    {label: "Auton", summary: 19, reliability: 93, unit: "pt"},
                    {label: "Coral", summary: 6.9, reliability: 87, unit: "cycles"},
                    {label: "Algae", summary: 3.2, reliability: 90, unit: "cycles"},
                    {label: "Climb", summary: 4.5, reliability: 82, unit: "pt"},
                ],
                capabilities: [
                    {label: "Ground Intake", enabled: "yes"},
                    {label: "Station Intake", enabled: "yes"},
                    {label: "Full Auto", enabled: "yes"},
                    {label: "4 Piece Auto", enabled: "yes"},
                    {label: "Defense", enabled: "no"},
                    {label: "Deep Climb", enabled: "no"},
                    {label: "Barge Scoring", enabled: "yes"},
                    {label: "Algae Ground Intake", enabled: "yes"},
                    {label: "L4 Coral", enabled: "yes"},
                ],
                matches: [
                    {
                        match: "Q30", result: "W", score: 135, pred_ai: 130, pred_heur: 125, pred_elo: 137,
                        teammates: [2910, 973, 254], opponents: [1690, 1323, 118],
                    },
                    {
                        match: "Q26", result: "W", score: 124, pred_ai: 121, pred_heur: 119, pred_elo: 122,
                        teammates: [2910, 4414, 192], opponents: [1323, 1678, 973],
                    },
                ],
                metrics: {
                    auto: 20,
                    teleop_coral: 56,
                    teleop_algae: 15,
                    climb: 16,
                    auto_reliability: 3
                },
                scoring: {
                    auto: 37, teleop_coral: 76, teleop_algae: 20, endgame: 12
                },
            },

            1323: {
                rank: 2,
                logoUrl: "/logos/1323.png",
                nickname: "MadTown Robotics",
                summary: [
                    {label: "Auton", summary: 17, reliability: 85, unit: "pt"},
                    {label: "Coral", summary: 8.2, reliability: 89, unit: "cycles"},
                    {label: "Algae", summary: 2.7, reliability: 80, unit: "cycles"},
                    {label: "Climb", summary: 5, reliability: 81, unit: "pt"},
                ],
                capabilities: [
                    {label: "Ground Intake", enabled: "yes"},
                    {label: "Station Intake", enabled: "yes"},
                    {label: "Full Auto", enabled: "yes"},
                    {label: "4 Piece Auto", enabled: "yes"},
                    {label: "Defense", enabled: "yes"},
                    {label: "Deep Climb", enabled: "not demonstrated"},
                    {label: "Barge Scoring", enabled: "no"},
                    {label: "Algae Ground Intake", enabled: "yes"},
                    {label: "L4 Coral", enabled: "not demonstrated"},
                ],
                rankings: [
                    {label: "Auton", rank: 7, percentile: 18},
                    {label: "Coral", rank: 4, percentile: 7},
                    {label: "Algae", rank: 10, percentile: 28},
                    {label: "Climb", rank: 8, percentile: 22},
                    {label: "Defense", rank: 3, percentile: 9},
                ],
                matches: [
                    {
                        match: "Q21", result: "W", score: 128, pred_ai: 127, pred_heur: 121, pred_elo: 122,
                        teammates: [1323, 973, 1690], opponents: [254, 118, 192],
                    },
                    {
                        match: "Q16", result: "L", score: 105, pred_ai: 107, pred_heur: 109, pred_elo: 100,
                        teammates: [1323, 254, 973], opponents: [2910, 1671, 192],
                    },
                    {
                        match: "Q30", result: "W", score: 135, pred_ai: 130, pred_heur: 125, pred_elo: 137,
                        teammates: [2910, 973, 254], opponents: [1690, 1323, 118],
                    },
                    {
                        match: "Q26", result: "W", score: 124, pred_ai: 121, pred_heur: 119, pred_elo: 122,
                        teammates: [2910, 4414, 192], opponents: [1323, 1678, 973],
                    },
                    {
                        match: "Q30", result: "W", score: 135, pred_ai: 130, pred_heur: 125, pred_elo: 137,
                        teammates: [2910, 973, 254], opponents: [1690, 1323, 118],
                    },
                    {
                        match: "Q26", result: "W", score: 124, pred_ai: 121, pred_heur: 119, pred_elo: 122,
                        teammates: [2910, 4414, 192], opponents: [1323, 1678, 973],
                    },
                ],
                metrics: {
                    auto: 32,
                    teleop_coral: 63,
                    teleop_algae: 4,
                    climb: 6,
                    auto_reliability: 6,
                },
                scoring: {
                    auto: 40, teleop_coral: 65, teleop_algae: 16, endgame: 12
                },
            },

            254: {
            },
        },
    },
}

const COLOR_PALETTE = [
    "#4E79A7", // muted blue
    "#F28E2B", // orange
    "#E15759", // red
    "#76B7B2", // teal
    "#59A14F", // green
    "#EDC948", // yellow
    "#B07AA1", // purple
    "#FF9DA7", // pink
    "#9C755F", // brown
    "#BAB0AC", // gray
    "#4E79A7", // muted blue
    "#F28E2B", // orange
    "#E15759", // red
    "#76B7B2", // teal
    "#59A14F", // green
    "#EDC948", // yellow
    "#B07AA1", // purple
    "#FF9DA7", // pink
    "#9C755F", // brown
    "#BAB0AC", // gray
];

const totalTeam = 75

const getNormalizedAllianceMetrics = (alliance: "red" | "blue") => {
    const teamStats = Object.fromEntries(
        TEMPDATA[alliance].teams
            .map(team => [team, TEMPDATA[alliance].teamData[team]?.metrics])
            .filter(([, score]) => score !== undefined)
    );

    const selected = Object.keys(teamStats).map(Number);
    const metricKeys = Object.keys(Object.values(teamStats)[0] || {});

    return metricKeys.map((metric) => {
        const max = Math.max(...selected.map((id) => teamStats[id]?.[metric] ?? 0)) || 1;

        return Object.fromEntries([
            ["metric", metric.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())],
            ...selected.map((id) => [
                id.toString(),
                Math.round(((teamStats[id]?.[metric] ?? 0) / max) * 10000) / 100,
            ]),
        ]);
    });
};

export const GRAPH_OPTIONS = [
    "Score Breakdown Norm.",
    "Score Breakdown Abs.",
    "Strength Map",
] as const;

export type GraphType = typeof GRAPH_OPTIONS[number];


export default function MatchDetailPage() {
    const {matchType, matchNum} = useParams<{ matchType: string; matchNum: string }>()
    if (!matchType || !matchNum || isNaN(Number(matchNum))) return <Navigate to="/404"/>;
    const matchNumInt = Number(matchNum);

    const [graphType, setGraphType] = useState<GraphType>("Strength Map")


    const scoreBreakdownDataNormalized = useMemo(() => {
        const getAllianceEntries = (
            alliance: "red" | "blue"
        ): Array<{ team: string; [scoreCategory: string]: number | string }> => {
            return TEMPDATA[alliance].teams.map((id) => ({
                team: `${alliance[0].toUpperCase()}${alliance.slice(1)} ${id}`,
                ...TEMPDATA[alliance].teamData[id]?.scoring,
            }));
        };

        const raw = [...getAllianceEntries("red"), ...getAllianceEntries("blue")];

        const normalized = raw.map((entry) => {
            const total = Object.entries(entry)
                .filter(([k]) => k !== "team")
                .reduce((sum, [, v]) => sum + Number(v), 0);

            return {
                ...entry,
                ...Object.fromEntries(
                    Object.entries(entry)
                        .filter(([k]) => k !== "team")
                        .map(([k, v]) => [k, parseFloat(((Number(v) / total) * 100).toFixed(2))])
                ),
            };
        });

        const keys =
            normalized.length > 0
                ? Object.keys(normalized[0]).filter((k) => k !== "team")
                : [];

        return {
            data: normalized,
            keys,
        };
    }, []);


    const scoreBreakdownDataAbsolute = useMemo(() => {
        const getAllianceEntries = (
            alliance: "red" | "blue"
        ): Array<{ team: string; [scoreCategory: string]: number | string }> => {
            return TEMPDATA[alliance].teams.map((id) => ({
                team: `${alliance[0].toUpperCase()}${alliance.slice(1)} ${id}`,
                ...TEMPDATA[alliance].teamData[id]?.scoring,
            }));
        };

        const raw = [...getAllianceEntries("red"), ...getAllianceEntries("blue")];

        const keys =
            raw.length > 0
                ? Object.keys(raw[0]).filter((k) => k !== "team")
                : [];

        return {
            data: raw,
            keys,
        };
    }, []);


    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col">

            {/* Header */}
            <div className="grid grid-cols-12">
                <div className="col-span-7 px-4 py-2 border-b bg-white shadow-sm flex justify-between items-center">
                    <div className="text-xl font-bold">
                        {
                            matchType === "qm" ? `Qualification match ${matchNum} of 84` :
                                matchType === "f" ? `Finals ${matchNum}` : (() => {
                                    if (matchNumInt <= 4) return `PlayOffs – Round 1 – Match ${matchNum}`;
                                    if (matchNumInt <= 8) return `PlayOffs – Round 2 – Match ${matchNum}`;
                                    if (matchNumInt <= 10) return `PlayOffs – Round 3 – Match ${matchNum}`;
                                    if (matchNumInt <= 12) return `PlayOffs – Round 4 – Match ${matchNum}`;
                                    if (matchNumInt === 13) return `PlayOffs – Round 5 – Match 13`;
                                    return `PlayOffs – Match ${matchNum}`;
                                })()
                        }
                    </div>
                    <div className="text-sm text-gray-500">Scheduled: 12:30 PM</div>
                    <div className="text-sm text-gray-700">Predicted: 132 - 121 | Final: 127 - 118</div>
                </div>
                <div className="col-span-5 bg-white border-b border-l p-1">
                    <Select value={graphType}
                            onValueChange={(v) => setGraphType(v as GraphType)}>
                        <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select graph type"/>
                        </SelectTrigger>
                        <SelectContent>
                            {GRAPH_OPTIONS.map((key) => (
                                <SelectItem key={key} value={key}>
                                    {key}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main Body */}
            <div className="flex-1 grid grid-cols-12">

                {/* Team Banners */}
                <div className="col-span-7 grid grid-rows-2 divide-y">
                    {(["red", "blue"] as const).map((allianceColor) => {
                        return (
                            <div className={`flex flex-col divide-y bg-${allianceColor}-50`}>
                                {TEMPDATA[allianceColor].teams.map((teamNum) => {
                                    const team = TEMPDATA?.[allianceColor]?.teamData?.[teamNum] ?? {};
                                    const summary = Array.isArray(team.summary) ? team.summary : [];
                                    const capabilities = Array.isArray(team.capabilities) ? team.capabilities : [];
                                    const rankings = Array.isArray(team.rankings) ? team.rankings : [];
                                    const matches = Array.isArray(team.matches) ? team.matches : [];
                                    const teamNickname = typeof team.nickname === "string" ? team.nickname : "Unknown";
                                    const teamRank = typeof team.rank === "number" ? team.rank : "N/A";
                                    const logoUrl = typeof team.logoUrl === "string" ? team.logoUrl : ""

                                    return (
                                        <div key={teamNum} className="h-[50%] bg-white p-2 @container">
                                            <div
                                                className={`flex w-full h-full overflow-x-auto border border-gray-400 h-sm:bg-zinc-600 ${allianceColor == "red" ? "bg-red-100" : "bg-blue-100"} rounded-xl shadow-sm text-sm`}>

                                                {/* Identity */}
                                                <div
                                                    className="flex flex-col items-center justify-center px-4 w-[160px] border-r border-gray-400 flex-grow-0 flex-shrink-0">
                                                    <img src={logoUrl} alt="Team Logo"
                                                         className="h-12 w-12 object-contain mb-1"/>
                                                    <div className="font-bold text-base">{teamNum ?? "???"}</div>
                                                    <div
                                                        className="text-gray-600">{teamNickname}</div>
                                                    <div className="text-xs text-gray-500">
                                                        RP Rank: {teamRank} / {totalTeam ?? "???"}
                                                    </div>
                                                </div>

                                                {/* Summary */}
                                                <div
                                                    className="flex flex-col items-start px-2 pt-1 w-[150px] border-r border-gray-400 flex-grow-0 flex-shrink-0">
                                                    <div className="font-semibold">Summary</div>
                                                    <div className="flex flex-col gap-1 w-full">
                                                        {summary.length > 0 ? (
                                                            summary.map((item, idx) => {
                                                                const rel = typeof item.reliability === "number" ? item.reliability : 0;
                                                                const label = item.label ?? "Unknown";
                                                                const value = item.summary ?? "N/A";
                                                                const unit = item.unit ?? "";
                                                                let color: string;

                                                                if (rel <= 50) {
                                                                    color = `rgb(255, ${Math.round((rel / 50) * 255)}, 80)`;
                                                                } else if (rel <= 85) {
                                                                    color = `rgb(${Math.round(255 - ((rel - 50) / 40) * 255)}, 255, 80)`;
                                                                } else {
                                                                    const t = (rel - 85) / 10;
                                                                    color = `rgb(0, ${Math.round((1 - t) * 255 + t * 180)}, ${Math.round((1 - t) * 80 + t * 255)})`;
                                                                }

                                                                return (
                                                                    <div key={idx} className="flex flex-col">
                                                                        <div className="flex justify-between text-xs">
                                                                            <span>{label}:</span>
                                                                            <span>{value} {unit}</span>
                                                                        </div>
                                                                        <div
                                                                            className="w-full h-1.5 rounded-full bg-zinc-200">
                                                                            <div
                                                                                className="h-1.5 rounded-full transition-all duration-300"
                                                                                style={{
                                                                                    width: `${rel}%`,
                                                                                    backgroundColor: color
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="text-sm text-gray-400">No summary
                                                                available</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Capabilities */}
                                                <div
                                                    className="flex flex-col items-start px-2 pt-1 w-[300px] border-r border-gray-400 flex-grow-0 flex-shrink-0">
                                                    <div className="font-semibold mb-1">Capabilities</div>
                                                    <div className="flex flex-wrap gap-1 text-xs">
                                                        {capabilities.length > 0 ? (
                                                            capabilities.map((cap, i) => (
                                                                <span
                                                                    key={i}
                                                                    className={`px-2 py-0.5 rounded-full ${
                                                                        cap.enabled === "yes"
                                                                            ? "bg-green-200 text-green-800"
                                                                            : cap.enabled === "no"
                                                                                ? "bg-red-200 text-red-800"
                                                                                : "bg-yellow-200 text-yellow-800"
                                                                    }`}
                                                                >
                                                            {cap.label}
                                                        </span>
                                                            ))
                                                        ) : (
                                                            <div className="text-sm text-gray-400">No capabilities
                                                                listed</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Rankings */}
                                                <div
                                                    className="flex flex-col items-start px-2 pt-1 w-[200px] border-r border-gray-400 flex-grow-0 flex-shrink-0">
                                                    <div className="font-semibold">Rankings</div>
                                                    {rankings.length > 0 ? (
                                                        <div className="flex-1 w-full flex items-center justify-center">
                                                            <div
                                                                className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs w-full">
                                                                {rankings.map((r, i) => {
                                                                    if (r.rank === undefined || r.percentile === undefined) {
                                                                        return (
                                                                            <React.Fragment key={i}>
                                                                                <div>{r.label}:</div>
                                                                                <div><span
                                                                                    className="text-gray-500 italic">No rank</span>
                                                                                </div>
                                                                            </React.Fragment>
                                                                        );
                                                                    }

                                                                    const rankRatio = r.rank / totalTeam;
                                                                    const percentile = r.percentile;

                                                                    let rankColor: string;
                                                                    let percentileColor: string;

                                                                    if (rankRatio <= 0.10) rankColor = "text-blue-500";
                                                                    else if (rankRatio <= 0.25) rankColor = "text-green-500";
                                                                    else if (rankRatio <= 0.5) rankColor = "text-orange-500";
                                                                    else if (rankRatio <= 0.75) rankColor = "text-yellow-500";
                                                                    else rankColor = "text-red-500";

                                                                    if (percentile <= 10) percentileColor = "text-blue-500";
                                                                    else if (percentile <= 25) percentileColor = "text-green-500";
                                                                    else if (percentile <= 50) percentileColor = "text-orange-500";
                                                                    else if (percentile <= 75) percentileColor = "text-yellow-500";
                                                                    else percentileColor = "text-red-500";

                                                                    return (
                                                                        <React.Fragment key={i}>
                                                                            <div>{r.label}:</div>
                                                                            <div>
                                                                        <span
                                                                            className={`${rankColor} font-semibold`}>#{r.rank}</span>{" "}
                                                                                (<span
                                                                                className={`${percentileColor} font-semibold`}>
                                                                        {r.percentile}%
                                                                    </span>)
                                                                            </div>
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-gray-400">No rankings
                                                            available</div>
                                                    )}
                                                </div>

                                                {/* Match History */}
                                                <div className="flex flex-col items-start pt-1 grow min-w-0">
                                                    <div className="font-semibold px-2 mb-0.5">Recent Matches</div>

                                                    {/* Scroll Container */}
                                                    <div
                                                        className={`h-full w-full overflow-x-auto scrollbar-thin ${allianceColor == "red" ? "scrollbar-thumb-red-400 scrollbar-track-red-200" : "scrollbar-thumb-blue-400 scrollbar-track-blue-200"}`}>
                                                        {/* Inner Row */}
                                                        <div className="flex gap-4 text-xs whitespace-nowrap">
                                                            {matches.length > 0 ? (
                                                                [...matches].reverse().map((m, i) => {
                                                                    const color = m.result === "W" ? "text-green-600" : "text-red-600";

                                                                    const PredDiffIcon = ({pred}: { pred: number }) => {
                                                                        if (m.score > pred) return <CircleArrowUp
                                                                            size={12}
                                                                            className="text-green-500 inline ml-1"/>;
                                                                        if (m.score < pred) return <CircleArrowDown
                                                                            size={12}
                                                                            className="text-red-500 inline ml-1"/>;
                                                                        return <CircleEqual size={12}
                                                                                            className="text-gray-500 inline ml-1"/>;
                                                                    };

                                                                    return (
                                                                        <div key={i}
                                                                             className="flex flex-col items-center w-18 shrink-0">
                                                                            <div className="font-mono">{m.match}</div>
                                                                            <div
                                                                                className={`font-bold ${color}`}>{m.result}</div>
                                                                            <div>{m.score} pts</div>
                                                                            <div
                                                                                className="text-gray-500">AI: {m.pred_ai}<PredDiffIcon
                                                                                pred={m.pred_ai}/></div>
                                                                            <div
                                                                                className="text-gray-500">H: {m.pred_heur}<PredDiffIcon
                                                                                pred={m.pred_heur}/></div>
                                                                            <div
                                                                                className="text-gray-500">ELO: {m.pred_elo}<PredDiffIcon
                                                                                pred={m.pred_elo}/></div>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className="text-sm text-gray-400">No match
                                                                    data</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    })}
                </div>

                {/* Charts */}
                {graphType === "Score Breakdown Norm." ? (
                    <div className="col-span-5 bg-white p-4 border-l">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="horizontal"
                                data={scoreBreakdownDataNormalized.data}
                                margin={{top: 20, right: 20, left: 40, bottom: 20}}
                            >
                                <CartesianGrid strokeDasharray="3 3"/>
                                <XAxis dataKey="team" type="category" interval={0} angle={0} height={60}/>
                                <YAxis type="number" domain={[0, 100]}/>
                                <Tooltip/>
                                <Legend/>
                                {scoreBreakdownDataNormalized.keys.map((key, i) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        stackId="a"
                                        fill={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                                        name={key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : graphType === "Score Breakdown Abs." ? (
                    <div className="col-span-5 bg-white p-4 border-l">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="horizontal"
                                data={scoreBreakdownDataAbsolute.data}
                                margin={{top: 20, right: 20, left: 40, bottom: 20}}
                            >
                                <CartesianGrid strokeDasharray="3 3"/>
                                <XAxis dataKey="team" type="category" interval={0} angle={0} height={60}/>
                                <YAxis type="number" domain={[0, 100]}/>
                                <Tooltip/>
                                <Legend/>
                                {scoreBreakdownDataAbsolute.keys.map((key, i) => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        stackId="a"
                                        fill={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                                        name={key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : graphType === "Strength Map" ? (
                    <div className="col-span-5 grid grid-rows-2 divide-y border-l">
                        {(["red", "blue"] as const).map((color) => {
                            const alliance = TEMPDATA[color];

                            return (
                                <div key={color} className="p-4 bg-white flex flex-col justify-center">
                                    <div
                                        className={`font-bold ${color == "red" ? "text-red-700" : "text-blue-700"} text-lg mb-2`}>
                                        {color.toUpperCase()} Alliance Strength
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart outerRadius="80%" data={getNormalizedAllianceMetrics(color)}>
                                            <PolarGrid/>
                                            <PolarAngleAxis dataKey="metric"/>
                                            <PolarRadiusAxis angle={30} domain={[0, "auto"]}/>
                                            {alliance.teams.map((id, i) => (
                                                <Radar
                                                    key={id}
                                                    name={`Team ${id}`}
                                                    dataKey={id.toString()}
                                                    stroke={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                                                    fill={COLOR_PALETTE[i % COLOR_PALETTE.length]}
                                                    fillOpacity={0.4}
                                                />
                                            ))}
                                            <Legend/>
                                            <Tooltip/>
                                        </RadarChart>
                                    </ResponsiveContainer>
                                    <div className="text-sm text-gray-700">
                                        Alliance combined data placeholder row 1
                                    </div>
                                    <div className="text-sm text-gray-700">
                                        Alliance combined data placeholder row 2
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : null}

            </div>
        </div>
    )
}
