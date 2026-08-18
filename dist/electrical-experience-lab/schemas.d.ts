import { z } from 'zod';
export declare const AX_STAGE_ORDER: readonly ["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"];
export declare const axStageSchema: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
export declare const AUTONOMY_MODES: readonly ["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"];
export declare const autonomyModeSchema: z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>;
export declare const SCENARIO_001_ALLOWED_AUTONOMY_MODES: readonly ["Assist", "Investigate", "Recommend"];
export declare const scenario001AutonomyModeSchema: z.ZodEnum<["Assist", "Investigate", "Recommend"]>;
export declare const equipmentIdSchema: z.ZodEnum<["hvac", "lighting", "other-loads"]>;
export declare const energyPeriodSchema: z.ZodEffects<z.ZodObject<{
    label: z.ZodString;
    totalEnergyKwh: z.ZodNumber;
    equipmentEnergyKwh: z.ZodObject<{
        hvac: z.ZodNumber;
        lighting: z.ZodNumber;
        otherLoads: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        hvac: number;
        lighting: number;
        otherLoads: number;
    }, {
        hvac: number;
        lighting: number;
        otherLoads: number;
    }>;
    hvacOperatingHoursPerDay: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    label: string;
    totalEnergyKwh: number;
    equipmentEnergyKwh: {
        hvac: number;
        lighting: number;
        otherLoads: number;
    };
    hvacOperatingHoursPerDay: number;
}, {
    label: string;
    totalEnergyKwh: number;
    equipmentEnergyKwh: {
        hvac: number;
        lighting: number;
        otherLoads: number;
    };
    hvacOperatingHoursPerDay: number;
}>, {
    label: string;
    totalEnergyKwh: number;
    equipmentEnergyKwh: {
        hvac: number;
        lighting: number;
        otherLoads: number;
    };
    hvacOperatingHoursPerDay: number;
}, {
    label: string;
    totalEnergyKwh: number;
    equipmentEnergyKwh: {
        hvac: number;
        lighting: number;
        otherLoads: number;
    };
    hvacOperatingHoursPerDay: number;
}>;
export declare const scenarioUnknownSchema: z.ZodObject<{
    id: z.ZodString;
    statement: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    statement: string;
}, {
    id: string;
    statement: string;
}>;
export declare const electricalScenarioSchema: z.ZodObject<{
    scenarioId: z.ZodString;
    title: z.ZodString;
    baseline: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        totalEnergyKwh: z.ZodNumber;
        equipmentEnergyKwh: z.ZodObject<{
            hvac: z.ZodNumber;
            lighting: z.ZodNumber;
            otherLoads: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            hvac: number;
            lighting: number;
            otherLoads: number;
        }, {
            hvac: number;
            lighting: number;
            otherLoads: number;
        }>;
        hvacOperatingHoursPerDay: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    }, {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    }>, {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    }, {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    }>;
    current: z.ZodEffects<z.ZodObject<{
        label: z.ZodString;
        totalEnergyKwh: z.ZodNumber;
        equipmentEnergyKwh: z.ZodObject<{
            hvac: z.ZodNumber;
            lighting: z.ZodNumber;
            otherLoads: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            hvac: number;
            lighting: number;
            otherLoads: number;
        }, {
            hvac: number;
            lighting: number;
            otherLoads: number;
        }>;
        hvacOperatingHoursPerDay: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    }, {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    }>, {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    }, {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    }>;
    knownUnknowns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        statement: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        statement: string;
    }, {
        id: string;
        statement: string;
    }>, "many">;
    allowedAutonomyModes: z.ZodArray<z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>, "many">;
}, "strip", z.ZodTypeAny, {
    title: string;
    scenarioId: string;
    baseline: {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    };
    current: {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    };
    knownUnknowns: {
        id: string;
        statement: string;
    }[];
    allowedAutonomyModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
}, {
    title: string;
    scenarioId: string;
    baseline: {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    };
    current: {
        label: string;
        totalEnergyKwh: number;
        equipmentEnergyKwh: {
            hvac: number;
            lighting: number;
            otherLoads: number;
        };
        hvacOperatingHoursPerDay: number;
    };
    knownUnknowns: {
        id: string;
        statement: string;
    }[];
    allowedAutonomyModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
}>;
export declare const electricalFactSchema: z.ZodObject<{
    id: z.ZodString;
    statement: z.ZodString;
    sourcePath: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    statement: string;
    sourcePath: string;
}, {
    id: string;
    statement: string;
    sourcePath: string;
}>;
export declare const percentageChangeCalculationSchema: z.ZodObject<{
    id: z.ZodString;
    baselineKwh: z.ZodNumber;
    currentKwh: z.ZodNumber;
    deltaKwh: z.ZodNumber;
    percentChange: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    baselineKwh: number;
    currentKwh: number;
    deltaKwh: number;
    percentChange: number;
}, {
    id: string;
    baselineKwh: number;
    currentKwh: number;
    deltaKwh: number;
    percentChange: number;
}>;
export declare const equipmentContributionCalculationSchema: z.ZodObject<{
    id: z.ZodString;
    equipmentId: z.ZodEnum<["hvac", "lighting", "other-loads"]>;
    label: z.ZodString;
    baselineKwh: z.ZodNumber;
    currentKwh: z.ZodNumber;
    deltaKwh: z.ZodNumber;
    percentChange: z.ZodNumber;
    shareOfTotalIncreasePercent: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    baselineKwh: number;
    currentKwh: number;
    deltaKwh: number;
    percentChange: number;
    equipmentId: "hvac" | "lighting" | "other-loads";
    shareOfTotalIncreasePercent: number;
}, {
    id: string;
    label: string;
    baselineKwh: number;
    currentKwh: number;
    deltaKwh: number;
    percentChange: number;
    equipmentId: "hvac" | "lighting" | "other-loads";
    shareOfTotalIncreasePercent: number;
}>;
export declare const operatingHoursDeltaCalculationSchema: z.ZodObject<{
    id: z.ZodString;
    equipmentId: z.ZodEnum<["hvac", "lighting", "other-loads"]>;
    baselineHoursPerDay: z.ZodNumber;
    currentHoursPerDay: z.ZodNumber;
    deltaHoursPerDay: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    equipmentId: "hvac" | "lighting" | "other-loads";
    baselineHoursPerDay: number;
    currentHoursPerDay: number;
    deltaHoursPerDay: number;
}, {
    id: string;
    equipmentId: "hvac" | "lighting" | "other-loads";
    baselineHoursPerDay: number;
    currentHoursPerDay: number;
    deltaHoursPerDay: number;
}>;
export declare const electricalHypothesisSchema: z.ZodObject<{
    id: z.ZodString;
    statement: z.ZodString;
    supportedBy: z.ZodArray<z.ZodString, "many">;
    confidence: z.ZodEnum<["high", "medium", "low"]>;
    limitation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    confidence: "high" | "medium" | "low";
    statement: string;
    supportedBy: string[];
    limitation: string;
}, {
    id: string;
    confidence: "high" | "medium" | "low";
    statement: string;
    supportedBy: string[];
    limitation: string;
}>;
export declare const recommendedCheckSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    rationale: z.ZodString;
    evidenceRefs: z.ZodArray<z.ZodString, "many">;
    resolvesUnknowns: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    rationale: string;
    id: string;
    label: string;
    evidenceRefs: string[];
    resolvesUnknowns: string[];
}, {
    rationale: string;
    id: string;
    label: string;
    evidenceRefs: string[];
    resolvesUnknowns: string[];
}>;
export declare const analysisConfidenceSchema: z.ZodObject<{
    score: z.ZodNumber;
    level: z.ZodEnum<["high", "medium", "low"]>;
    rationale: z.ZodString;
}, "strip", z.ZodTypeAny, {
    rationale: string;
    level: "high" | "medium" | "low";
    score: number;
}, {
    rationale: string;
    level: "high" | "medium" | "low";
    score: number;
}>;
export declare const electricalAnalysisSchema: z.ZodObject<{
    scenarioId: z.ZodString;
    facts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        statement: z.ZodString;
        sourcePath: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        statement: string;
        sourcePath: string;
    }, {
        id: string;
        statement: string;
        sourcePath: string;
    }>, "many">;
    calculations: z.ZodObject<{
        totalEnergyChange: z.ZodObject<{
            id: z.ZodString;
            baselineKwh: z.ZodNumber;
            currentKwh: z.ZodNumber;
            deltaKwh: z.ZodNumber;
            percentChange: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
        }, {
            id: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
        }>;
        equipmentContributions: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            equipmentId: z.ZodEnum<["hvac", "lighting", "other-loads"]>;
            label: z.ZodString;
            baselineKwh: z.ZodNumber;
            currentKwh: z.ZodNumber;
            deltaKwh: z.ZodNumber;
            percentChange: z.ZodNumber;
            shareOfTotalIncreasePercent: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            label: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
            equipmentId: "hvac" | "lighting" | "other-loads";
            shareOfTotalIncreasePercent: number;
        }, {
            id: string;
            label: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
            equipmentId: "hvac" | "lighting" | "other-loads";
            shareOfTotalIncreasePercent: number;
        }>, "many">;
        operatingHoursDelta: z.ZodObject<{
            id: z.ZodString;
            equipmentId: z.ZodEnum<["hvac", "lighting", "other-loads"]>;
            baselineHoursPerDay: z.ZodNumber;
            currentHoursPerDay: z.ZodNumber;
            deltaHoursPerDay: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            id: string;
            equipmentId: "hvac" | "lighting" | "other-loads";
            baselineHoursPerDay: number;
            currentHoursPerDay: number;
            deltaHoursPerDay: number;
        }, {
            id: string;
            equipmentId: "hvac" | "lighting" | "other-loads";
            baselineHoursPerDay: number;
            currentHoursPerDay: number;
            deltaHoursPerDay: number;
        }>;
    }, "strip", z.ZodTypeAny, {
        totalEnergyChange: {
            id: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
        };
        equipmentContributions: {
            id: string;
            label: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
            equipmentId: "hvac" | "lighting" | "other-loads";
            shareOfTotalIncreasePercent: number;
        }[];
        operatingHoursDelta: {
            id: string;
            equipmentId: "hvac" | "lighting" | "other-loads";
            baselineHoursPerDay: number;
            currentHoursPerDay: number;
            deltaHoursPerDay: number;
        };
    }, {
        totalEnergyChange: {
            id: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
        };
        equipmentContributions: {
            id: string;
            label: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
            equipmentId: "hvac" | "lighting" | "other-loads";
            shareOfTotalIncreasePercent: number;
        }[];
        operatingHoursDelta: {
            id: string;
            equipmentId: "hvac" | "lighting" | "other-loads";
            baselineHoursPerDay: number;
            currentHoursPerDay: number;
            deltaHoursPerDay: number;
        };
    }>;
    hypotheses: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        statement: z.ZodString;
        supportedBy: z.ZodArray<z.ZodString, "many">;
        confidence: z.ZodEnum<["high", "medium", "low"]>;
        limitation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        confidence: "high" | "medium" | "low";
        statement: string;
        supportedBy: string[];
        limitation: string;
    }, {
        id: string;
        confidence: "high" | "medium" | "low";
        statement: string;
        supportedBy: string[];
        limitation: string;
    }>, "many">;
    unknowns: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        statement: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        statement: string;
    }, {
        id: string;
        statement: string;
    }>, "many">;
    recommendedChecks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        rationale: z.ZodString;
        evidenceRefs: z.ZodArray<z.ZodString, "many">;
        resolvesUnknowns: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        rationale: string;
        id: string;
        label: string;
        evidenceRefs: string[];
        resolvesUnknowns: string[];
    }, {
        rationale: string;
        id: string;
        label: string;
        evidenceRefs: string[];
        resolvesUnknowns: string[];
    }>, "many">;
    confidence: z.ZodObject<{
        score: z.ZodNumber;
        level: z.ZodEnum<["high", "medium", "low"]>;
        rationale: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        rationale: string;
        level: "high" | "medium" | "low";
        score: number;
    }, {
        rationale: string;
        level: "high" | "medium" | "low";
        score: number;
    }>;
}, "strip", z.ZodTypeAny, {
    confidence: {
        rationale: string;
        level: "high" | "medium" | "low";
        score: number;
    };
    scenarioId: string;
    facts: {
        id: string;
        statement: string;
        sourcePath: string;
    }[];
    calculations: {
        totalEnergyChange: {
            id: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
        };
        equipmentContributions: {
            id: string;
            label: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
            equipmentId: "hvac" | "lighting" | "other-loads";
            shareOfTotalIncreasePercent: number;
        }[];
        operatingHoursDelta: {
            id: string;
            equipmentId: "hvac" | "lighting" | "other-loads";
            baselineHoursPerDay: number;
            currentHoursPerDay: number;
            deltaHoursPerDay: number;
        };
    };
    hypotheses: {
        id: string;
        confidence: "high" | "medium" | "low";
        statement: string;
        supportedBy: string[];
        limitation: string;
    }[];
    unknowns: {
        id: string;
        statement: string;
    }[];
    recommendedChecks: {
        rationale: string;
        id: string;
        label: string;
        evidenceRefs: string[];
        resolvesUnknowns: string[];
    }[];
}, {
    confidence: {
        rationale: string;
        level: "high" | "medium" | "low";
        score: number;
    };
    scenarioId: string;
    facts: {
        id: string;
        statement: string;
        sourcePath: string;
    }[];
    calculations: {
        totalEnergyChange: {
            id: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
        };
        equipmentContributions: {
            id: string;
            label: string;
            baselineKwh: number;
            currentKwh: number;
            deltaKwh: number;
            percentChange: number;
            equipmentId: "hvac" | "lighting" | "other-loads";
            shareOfTotalIncreasePercent: number;
        }[];
        operatingHoursDelta: {
            id: string;
            equipmentId: "hvac" | "lighting" | "other-loads";
            baselineHoursPerDay: number;
            currentHoursPerDay: number;
            deltaHoursPerDay: number;
        };
    };
    hypotheses: {
        id: string;
        confidence: "high" | "medium" | "low";
        statement: string;
        supportedBy: string[];
        limitation: string;
    }[];
    unknowns: {
        id: string;
        statement: string;
    }[];
    recommendedChecks: {
        rationale: string;
        id: string;
        label: string;
        evidenceRefs: string[];
        resolvesUnknowns: string[];
    }[];
}>;
export declare const claimTypeSchema: z.ZodEnum<["fact", "calculation", "hypothesis", "unknown"]>;
export declare const experienceClaimSchema: z.ZodEffects<z.ZodObject<{
    text: z.ZodString;
    claimType: z.ZodEnum<["fact", "calculation", "hypothesis", "unknown"]>;
    evidenceRefs: z.ZodArray<z.ZodString, "many">;
    uncertaintyNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    text: string;
    evidenceRefs: string[];
    claimType: "unknown" | "fact" | "calculation" | "hypothesis";
    uncertaintyNote?: string | undefined;
}, {
    text: string;
    evidenceRefs: string[];
    claimType: "unknown" | "fact" | "calculation" | "hypothesis";
    uncertaintyNote?: string | undefined;
}>, {
    text: string;
    evidenceRefs: string[];
    claimType: "unknown" | "fact" | "calculation" | "hypothesis";
    uncertaintyNote?: string | undefined;
}, {
    text: string;
    evidenceRefs: string[];
    claimType: "unknown" | "fact" | "calculation" | "hypothesis";
    uncertaintyNote?: string | undefined;
}>;
export declare const experienceEvidenceSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    value: z.ZodString;
    visible: z.ZodBoolean;
    sourceRefs: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    value: string;
    visible: boolean;
    sourceRefs: string[];
}, {
    id: string;
    label: string;
    value: string;
    visible: boolean;
    sourceRefs: string[];
}>;
export declare const experienceActionSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    description: z.ZodString;
    autonomyMode: z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>;
    axStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
    reversible: z.ZodBoolean;
    changesEquipmentState: z.ZodBoolean;
    evidenceRefs: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    label: string;
    description: string;
    evidenceRefs: string[];
    autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
    axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    reversible: boolean;
    changesEquipmentState: boolean;
}, {
    id: string;
    label: string;
    description: string;
    evidenceRefs: string[];
    autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
    axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    reversible: boolean;
    changesEquipmentState: boolean;
}>;
export declare const hiddenDetailSchema: z.ZodObject<{
    label: z.ZodString;
    value: z.ZodString;
    reasonHidden: z.ZodString;
    priority: z.ZodEnum<["supporting", "technical"]>;
    sourceRefs: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    label: string;
    value: string;
    priority: "technical" | "supporting";
    sourceRefs: string[];
    reasonHidden: string;
}, {
    label: string;
    value: string;
    priority: "technical" | "supporting";
    sourceRefs: string[];
    reasonHidden: string;
}>;
export declare const axCapabilitySchema: z.ZodEnum<["analyze_energy_data", "compare_periods", "explain_evidence", "recommend_check", "change_schedule", "control_equipment"]>;
export declare const experienceRecommendationSchema: z.ZodObject<{
    scenarioId: z.ZodString;
    primaryMessage: z.ZodEffects<z.ZodObject<{
        text: z.ZodString;
        claimType: z.ZodEnum<["fact", "calculation", "hypothesis", "unknown"]>;
        evidenceRefs: z.ZodArray<z.ZodString, "many">;
        uncertaintyNote: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        evidenceRefs: string[];
        claimType: "unknown" | "fact" | "calculation" | "hypothesis";
        uncertaintyNote?: string | undefined;
    }, {
        text: string;
        evidenceRefs: string[];
        claimType: "unknown" | "fact" | "calculation" | "hypothesis";
        uncertaintyNote?: string | undefined;
    }>, {
        text: string;
        evidenceRefs: string[];
        claimType: "unknown" | "fact" | "calculation" | "hypothesis";
        uncertaintyNote?: string | undefined;
    }, {
        text: string;
        evidenceRefs: string[];
        claimType: "unknown" | "fact" | "calculation" | "hypothesis";
        uncertaintyNote?: string | undefined;
    }>;
    explanation: z.ZodObject<{
        summary: z.ZodEffects<z.ZodObject<{
            text: z.ZodString;
            claimType: z.ZodEnum<["fact", "calculation", "hypothesis", "unknown"]>;
            evidenceRefs: z.ZodArray<z.ZodString, "many">;
            uncertaintyNote: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }, {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }>, {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }, {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }>;
        claims: z.ZodArray<z.ZodEffects<z.ZodObject<{
            text: z.ZodString;
            claimType: z.ZodEnum<["fact", "calculation", "hypothesis", "unknown"]>;
            evidenceRefs: z.ZodArray<z.ZodString, "many">;
            uncertaintyNote: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }, {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }>, {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }, {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        summary: {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        };
        claims: {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }[];
    }, {
        summary: {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        };
        claims: {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }[];
    }>;
    evidence: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        value: z.ZodString;
        visible: z.ZodBoolean;
        sourceRefs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        value: string;
        visible: boolean;
        sourceRefs: string[];
    }, {
        id: string;
        label: string;
        value: string;
        visible: boolean;
        sourceRefs: string[];
    }>, "many">;
    primaryAction: z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        description: z.ZodString;
        autonomyMode: z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>;
        axStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
        reversible: z.ZodBoolean;
        changesEquipmentState: z.ZodBoolean;
        evidenceRefs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }, {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }>;
    secondaryActions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        description: z.ZodString;
        autonomyMode: z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>;
        axStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
        reversible: z.ZodBoolean;
        changesEquipmentState: z.ZodBoolean;
        evidenceRefs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }, {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }>, "many">;
    hiddenDetails: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        value: z.ZodString;
        reasonHidden: z.ZodString;
        priority: z.ZodEnum<["supporting", "technical"]>;
        sourceRefs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        label: string;
        value: string;
        priority: "technical" | "supporting";
        sourceRefs: string[];
        reasonHidden: string;
    }, {
        label: string;
        value: string;
        priority: "technical" | "supporting";
        sourceRefs: string[];
        reasonHidden: string;
    }>, "many">;
    trustElements: z.ZodObject<{
        confidence: z.ZodObject<{
            score: z.ZodNumber;
            label: z.ZodEnum<["high", "medium", "low"]>;
            text: z.ZodString;
            sourceRefs: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            label: "high" | "medium" | "low";
            text: string;
            score: number;
            sourceRefs: string[];
        }, {
            label: "high" | "medium" | "low";
            text: string;
            score: number;
            sourceRefs: string[];
        }>;
        uncertainty: z.ZodObject<{
            text: z.ZodString;
            sourceRefs: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            text: string;
            sourceRefs: string[];
        }, {
            text: string;
            sourceRefs: string[];
        }>;
        evidenceBasis: z.ZodObject<{
            text: z.ZodString;
            sourceRefs: z.ZodArray<z.ZodString, "many">;
        }, "strip", z.ZodTypeAny, {
            text: string;
            sourceRefs: string[];
        }, {
            text: string;
            sourceRefs: string[];
        }>;
        autonomyBoundary: z.ZodObject<{
            text: z.ZodString;
            allowedModes: z.ZodArray<z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>, "many">;
            prohibitedCapabilities: z.ZodArray<z.ZodEnum<["analyze_energy_data", "compare_periods", "explain_evidence", "recommend_check", "change_schedule", "control_equipment"]>, "many">;
        }, "strip", z.ZodTypeAny, {
            text: string;
            allowedModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
            prohibitedCapabilities: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
        }, {
            text: string;
            allowedModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
            prohibitedCapabilities: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
        }>;
    }, "strip", z.ZodTypeAny, {
        confidence: {
            label: "high" | "medium" | "low";
            text: string;
            score: number;
            sourceRefs: string[];
        };
        uncertainty: {
            text: string;
            sourceRefs: string[];
        };
        evidenceBasis: {
            text: string;
            sourceRefs: string[];
        };
        autonomyBoundary: {
            text: string;
            allowedModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
            prohibitedCapabilities: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
        };
    }, {
        confidence: {
            label: "high" | "medium" | "low";
            text: string;
            score: number;
            sourceRefs: string[];
        };
        uncertainty: {
            text: string;
            sourceRefs: string[];
        };
        evidenceBasis: {
            text: string;
            sourceRefs: string[];
        };
        autonomyBoundary: {
            text: string;
            allowedModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
            prohibitedCapabilities: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
        };
    }>;
}, "strip", z.ZodTypeAny, {
    evidence: {
        id: string;
        label: string;
        value: string;
        visible: boolean;
        sourceRefs: string[];
    }[];
    scenarioId: string;
    primaryMessage: {
        text: string;
        evidenceRefs: string[];
        claimType: "unknown" | "fact" | "calculation" | "hypothesis";
        uncertaintyNote?: string | undefined;
    };
    explanation: {
        summary: {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        };
        claims: {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }[];
    };
    primaryAction: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    };
    secondaryActions: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }[];
    hiddenDetails: {
        label: string;
        value: string;
        priority: "technical" | "supporting";
        sourceRefs: string[];
        reasonHidden: string;
    }[];
    trustElements: {
        confidence: {
            label: "high" | "medium" | "low";
            text: string;
            score: number;
            sourceRefs: string[];
        };
        uncertainty: {
            text: string;
            sourceRefs: string[];
        };
        evidenceBasis: {
            text: string;
            sourceRefs: string[];
        };
        autonomyBoundary: {
            text: string;
            allowedModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
            prohibitedCapabilities: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
        };
    };
}, {
    evidence: {
        id: string;
        label: string;
        value: string;
        visible: boolean;
        sourceRefs: string[];
    }[];
    scenarioId: string;
    primaryMessage: {
        text: string;
        evidenceRefs: string[];
        claimType: "unknown" | "fact" | "calculation" | "hypothesis";
        uncertaintyNote?: string | undefined;
    };
    explanation: {
        summary: {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        };
        claims: {
            text: string;
            evidenceRefs: string[];
            claimType: "unknown" | "fact" | "calculation" | "hypothesis";
            uncertaintyNote?: string | undefined;
        }[];
    };
    primaryAction: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    };
    secondaryActions: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }[];
    hiddenDetails: {
        label: string;
        value: string;
        priority: "technical" | "supporting";
        sourceRefs: string[];
        reasonHidden: string;
    }[];
    trustElements: {
        confidence: {
            label: "high" | "medium" | "low";
            text: string;
            score: number;
            sourceRefs: string[];
        };
        uncertainty: {
            text: string;
            sourceRefs: string[];
        };
        evidenceBasis: {
            text: string;
            sourceRefs: string[];
        };
        autonomyBoundary: {
            text: string;
            allowedModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
            prohibitedCapabilities: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
        };
    };
}>;
export declare const axRecommendationSchema: z.ZodObject<{
    scenarioId: z.ZodString;
    stagePath: z.ZodTuple<[z.ZodLiteral<"SEE">, z.ZodLiteral<"UNDERSTAND">, z.ZodLiteral<"PLAN">, z.ZodLiteral<"ACT">, z.ZodLiteral<"VERIFY">], null>;
    currentStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
    recommendedStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
    selectedAutonomy: z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>;
    allowedAutonomyModes: z.ZodArray<z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>, "many">;
    aiCan: z.ZodArray<z.ZodEnum<["analyze_energy_data", "compare_periods", "explain_evidence", "recommend_check", "change_schedule", "control_equipment"]>, "many">;
    aiCannot: z.ZodArray<z.ZodEnum<["analyze_energy_data", "compare_periods", "explain_evidence", "recommend_check", "change_schedule", "control_equipment"]>, "many">;
    suggestedNextStep: z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        description: z.ZodString;
        autonomyMode: z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>;
        axStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
        reversible: z.ZodBoolean;
        changesEquipmentState: z.ZodBoolean;
        evidenceRefs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }, {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }>;
    verification: z.ZodObject<{
        stage: z.ZodLiteral<"VERIFY">;
        successCriteria: z.ZodArray<z.ZodString, "many">;
        evidenceRefs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    }, {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    scenarioId: string;
    allowedAutonomyModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
    stagePath: ["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"];
    currentStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    recommendedStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    selectedAutonomy: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
    aiCan: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    aiCannot: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    suggestedNextStep: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    };
    verification: {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    };
}, {
    scenarioId: string;
    allowedAutonomyModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
    stagePath: ["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"];
    currentStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    recommendedStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    selectedAutonomy: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
    aiCan: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    aiCannot: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    suggestedNextStep: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    };
    verification: {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    };
}>;
export declare const scenario001AxRecommendationSchema: z.ZodEffects<z.ZodObject<{
    scenarioId: z.ZodString;
    stagePath: z.ZodTuple<[z.ZodLiteral<"SEE">, z.ZodLiteral<"UNDERSTAND">, z.ZodLiteral<"PLAN">, z.ZodLiteral<"ACT">, z.ZodLiteral<"VERIFY">], null>;
    currentStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
    recommendedStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
    selectedAutonomy: z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>;
    allowedAutonomyModes: z.ZodArray<z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>, "many">;
    aiCan: z.ZodArray<z.ZodEnum<["analyze_energy_data", "compare_periods", "explain_evidence", "recommend_check", "change_schedule", "control_equipment"]>, "many">;
    aiCannot: z.ZodArray<z.ZodEnum<["analyze_energy_data", "compare_periods", "explain_evidence", "recommend_check", "change_schedule", "control_equipment"]>, "many">;
    suggestedNextStep: z.ZodObject<{
        id: z.ZodString;
        label: z.ZodString;
        description: z.ZodString;
        autonomyMode: z.ZodEnum<["Manual", "Assist", "Investigate", "Recommend", "Prepare", "Act"]>;
        axStage: z.ZodEnum<["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"]>;
        reversible: z.ZodBoolean;
        changesEquipmentState: z.ZodBoolean;
        evidenceRefs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }, {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    }>;
    verification: z.ZodObject<{
        stage: z.ZodLiteral<"VERIFY">;
        successCriteria: z.ZodArray<z.ZodString, "many">;
        evidenceRefs: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    }, {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    scenarioId: string;
    allowedAutonomyModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
    stagePath: ["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"];
    currentStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    recommendedStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    selectedAutonomy: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
    aiCan: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    aiCannot: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    suggestedNextStep: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    };
    verification: {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    };
}, {
    scenarioId: string;
    allowedAutonomyModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
    stagePath: ["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"];
    currentStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    recommendedStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    selectedAutonomy: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
    aiCan: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    aiCannot: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    suggestedNextStep: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    };
    verification: {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    };
}>, {
    scenarioId: string;
    allowedAutonomyModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
    stagePath: ["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"];
    currentStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    recommendedStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    selectedAutonomy: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
    aiCan: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    aiCannot: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    suggestedNextStep: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    };
    verification: {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    };
}, {
    scenarioId: string;
    allowedAutonomyModes: ("Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act")[];
    stagePath: ["SEE", "UNDERSTAND", "PLAN", "ACT", "VERIFY"];
    currentStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    recommendedStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
    selectedAutonomy: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
    aiCan: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    aiCannot: ("analyze_energy_data" | "compare_periods" | "explain_evidence" | "recommend_check" | "change_schedule" | "control_equipment")[];
    suggestedNextStep: {
        id: string;
        label: string;
        description: string;
        evidenceRefs: string[];
        autonomyMode: "Manual" | "Assist" | "Investigate" | "Recommend" | "Prepare" | "Act";
        axStage: "SEE" | "UNDERSTAND" | "PLAN" | "ACT" | "VERIFY";
        reversible: boolean;
        changesEquipmentState: boolean;
    };
    verification: {
        stage: "VERIFY";
        evidenceRefs: string[];
        successCriteria: string[];
    };
}>;
export declare const criticCheckIdSchema: z.ZodEnum<["unsupported_claims", "evidence_visibility", "progressive_disclosure", "uncertainty", "autonomy_safety"]>;
export declare const criticCheckSchema: z.ZodObject<{
    id: z.ZodEnum<["unsupported_claims", "evidence_visibility", "progressive_disclosure", "uncertainty", "autonomy_safety"]>;
    status: z.ZodEnum<["pass", "fail", "partial", "unknown"]>;
    severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
    confidence: z.ZodEnum<["high", "medium", "low"]>;
    evidence: z.ZodArray<z.ZodString, "many">;
    recommendation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
    status: "pass" | "fail" | "partial" | "unknown";
    confidence: "high" | "medium" | "low";
    severity: "critical" | "high" | "medium" | "low";
    evidence: string[];
    recommendation: string;
}, {
    id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
    status: "pass" | "fail" | "partial" | "unknown";
    confidence: "high" | "medium" | "low";
    severity: "critical" | "high" | "medium" | "low";
    evidence: string[];
    recommendation: string;
}>;
export declare const criticResultSchema: z.ZodObject<{
    criticId: z.ZodEnum<["electrical", "experience-ax"]>;
    passed: z.ZodBoolean;
    score: z.ZodNumber;
    checks: z.ZodArray<z.ZodObject<{
        id: z.ZodEnum<["unsupported_claims", "evidence_visibility", "progressive_disclosure", "uncertainty", "autonomy_safety"]>;
        status: z.ZodEnum<["pass", "fail", "partial", "unknown"]>;
        severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
        confidence: z.ZodEnum<["high", "medium", "low"]>;
        evidence: z.ZodArray<z.ZodString, "many">;
        recommendation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
        status: "pass" | "fail" | "partial" | "unknown";
        confidence: "high" | "medium" | "low";
        severity: "critical" | "high" | "medium" | "low";
        evidence: string[];
        recommendation: string;
    }, {
        id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
        status: "pass" | "fail" | "partial" | "unknown";
        confidence: "high" | "medium" | "low";
        severity: "critical" | "high" | "medium" | "low";
        evidence: string[];
        recommendation: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    score: number;
    criticId: "electrical" | "experience-ax";
    passed: boolean;
    checks: {
        id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
        status: "pass" | "fail" | "partial" | "unknown";
        confidence: "high" | "medium" | "low";
        severity: "critical" | "high" | "medium" | "low";
        evidence: string[];
        recommendation: string;
    }[];
}, {
    score: number;
    criticId: "electrical" | "experience-ax";
    passed: boolean;
    checks: {
        id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
        status: "pass" | "fail" | "partial" | "unknown";
        confidence: "high" | "medium" | "low";
        severity: "critical" | "high" | "medium" | "low";
        evidence: string[];
        recommendation: string;
    }[];
}>;
export declare const criticSuiteResultSchema: z.ZodObject<{
    passed: z.ZodBoolean;
    results: z.ZodTuple<[z.ZodObject<{
        criticId: z.ZodEnum<["electrical", "experience-ax"]>;
        passed: z.ZodBoolean;
        score: z.ZodNumber;
        checks: z.ZodArray<z.ZodObject<{
            id: z.ZodEnum<["unsupported_claims", "evidence_visibility", "progressive_disclosure", "uncertainty", "autonomy_safety"]>;
            status: z.ZodEnum<["pass", "fail", "partial", "unknown"]>;
            severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
            confidence: z.ZodEnum<["high", "medium", "low"]>;
            evidence: z.ZodArray<z.ZodString, "many">;
            recommendation: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }, {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        score: number;
        criticId: "electrical" | "experience-ax";
        passed: boolean;
        checks: {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }[];
    }, {
        score: number;
        criticId: "electrical" | "experience-ax";
        passed: boolean;
        checks: {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }[];
    }>, z.ZodObject<{
        criticId: z.ZodEnum<["electrical", "experience-ax"]>;
        passed: z.ZodBoolean;
        score: z.ZodNumber;
        checks: z.ZodArray<z.ZodObject<{
            id: z.ZodEnum<["unsupported_claims", "evidence_visibility", "progressive_disclosure", "uncertainty", "autonomy_safety"]>;
            status: z.ZodEnum<["pass", "fail", "partial", "unknown"]>;
            severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
            confidence: z.ZodEnum<["high", "medium", "low"]>;
            evidence: z.ZodArray<z.ZodString, "many">;
            recommendation: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }, {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        score: number;
        criticId: "electrical" | "experience-ax";
        passed: boolean;
        checks: {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }[];
    }, {
        score: number;
        criticId: "electrical" | "experience-ax";
        passed: boolean;
        checks: {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }[];
    }>], null>;
}, "strip", z.ZodTypeAny, {
    passed: boolean;
    results: [{
        score: number;
        criticId: "electrical" | "experience-ax";
        passed: boolean;
        checks: {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }[];
    }, {
        score: number;
        criticId: "electrical" | "experience-ax";
        passed: boolean;
        checks: {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }[];
    }];
}, {
    passed: boolean;
    results: [{
        score: number;
        criticId: "electrical" | "experience-ax";
        passed: boolean;
        checks: {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }[];
    }, {
        score: number;
        criticId: "electrical" | "experience-ax";
        passed: boolean;
        checks: {
            id: "uncertainty" | "unsupported_claims" | "evidence_visibility" | "progressive_disclosure" | "autonomy_safety";
            status: "pass" | "fail" | "partial" | "unknown";
            confidence: "high" | "medium" | "low";
            severity: "critical" | "high" | "medium" | "low";
            evidence: string[];
            recommendation: string;
        }[];
    }];
}>;
export type AxStage = z.infer<typeof axStageSchema>;
export type AutonomyMode = z.infer<typeof autonomyModeSchema>;
export type AxCapability = z.infer<typeof axCapabilitySchema>;
export type ElectricalScenario = z.infer<typeof electricalScenarioSchema>;
export type ElectricalAnalysis = z.infer<typeof electricalAnalysisSchema>;
export type PercentageChangeCalculation = z.infer<typeof percentageChangeCalculationSchema>;
export type EquipmentContributionCalculation = z.infer<typeof equipmentContributionCalculationSchema>;
export type OperatingHoursDeltaCalculation = z.infer<typeof operatingHoursDeltaCalculationSchema>;
export type ExperienceClaim = z.infer<typeof experienceClaimSchema>;
export type ExperienceRecommendation = z.infer<typeof experienceRecommendationSchema>;
export type ExperienceAction = z.infer<typeof experienceActionSchema>;
export type AxRecommendation = z.infer<typeof axRecommendationSchema>;
export type CriticCheckId = z.infer<typeof criticCheckIdSchema>;
export type CriticCheck = z.infer<typeof criticCheckSchema>;
export type CriticResult = z.infer<typeof criticResultSchema>;
export type CriticSuiteResult = z.infer<typeof criticSuiteResultSchema>;
