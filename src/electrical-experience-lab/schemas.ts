import { z } from 'zod';

import {
  validationConfidenceSchema,
  validationSeveritySchema,
  validationStatusSchema
} from '../contract.js';

export const AX_STAGE_ORDER = ['SEE', 'UNDERSTAND', 'PLAN', 'ACT', 'VERIFY'] as const;
export const axStageSchema = z.enum(AX_STAGE_ORDER);

export const AUTONOMY_MODES = [
  'Manual',
  'Assist',
  'Investigate',
  'Recommend',
  'Prepare',
  'Act'
] as const;
export const autonomyModeSchema = z.enum(AUTONOMY_MODES);

export const SCENARIO_001_ALLOWED_AUTONOMY_MODES = [
  'Assist',
  'Investigate',
  'Recommend'
] as const;
export const scenario001AutonomyModeSchema = z.enum(
  SCENARIO_001_ALLOWED_AUTONOMY_MODES
);

export const equipmentIdSchema = z.enum(['hvac', 'lighting', 'other-loads']);

const energyValuesSchema = z.object({
  hvac: z.number().nonnegative(),
  lighting: z.number().nonnegative(),
  otherLoads: z.number().nonnegative()
});

export const energyPeriodSchema = z
  .object({
    label: z.string().min(1),
    totalEnergyKwh: z.number().positive(),
    equipmentEnergyKwh: energyValuesSchema,
    hvacOperatingHoursPerDay: z.number().nonnegative().max(24)
  })
  .superRefine((period, context) => {
    const equipmentTotal =
      period.equipmentEnergyKwh.hvac +
      period.equipmentEnergyKwh.lighting +
      period.equipmentEnergyKwh.otherLoads;

    if (Math.abs(equipmentTotal - period.totalEnergyKwh) > 0.001) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentEnergyKwh'],
        message: 'Equipment energy must sum to total energy.'
      });
    }
  });

export const scenarioUnknownSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1)
});

export const electricalScenarioSchema = z.object({
  scenarioId: z.string().min(1),
  title: z.string().min(1),
  baseline: energyPeriodSchema,
  current: energyPeriodSchema,
  knownUnknowns: z.array(scenarioUnknownSchema).min(1),
  allowedAutonomyModes: z.array(autonomyModeSchema).min(1)
});

export const electricalFactSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  sourcePath: z.string().min(1)
});

export const percentageChangeCalculationSchema = z.object({
  id: z.string().min(1),
  baselineKwh: z.number().nonnegative(),
  currentKwh: z.number().nonnegative(),
  deltaKwh: z.number(),
  percentChange: z.number()
});

export const equipmentContributionCalculationSchema = z.object({
  id: z.string().min(1),
  equipmentId: equipmentIdSchema,
  label: z.string().min(1),
  baselineKwh: z.number().nonnegative(),
  currentKwh: z.number().nonnegative(),
  deltaKwh: z.number(),
  percentChange: z.number(),
  shareOfTotalIncreasePercent: z.number()
});

export const operatingHoursDeltaCalculationSchema = z.object({
  id: z.string().min(1),
  equipmentId: equipmentIdSchema,
  baselineHoursPerDay: z.number().nonnegative().max(24),
  currentHoursPerDay: z.number().nonnegative().max(24),
  deltaHoursPerDay: z.number()
});

export const electricalHypothesisSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  supportedBy: z.array(z.string().min(1)).min(1),
  confidence: validationConfidenceSchema,
  limitation: z.string().min(1)
});

export const recommendedCheckSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  rationale: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  resolvesUnknowns: z.array(z.string().min(1)).min(1)
});

export const analysisConfidenceSchema = z.object({
  score: z.number().min(0).max(100),
  level: validationConfidenceSchema,
  rationale: z.string().min(1)
});

export const electricalAnalysisSchema = z.object({
  scenarioId: z.string().min(1),
  facts: z.array(electricalFactSchema).min(1),
  calculations: z.object({
    totalEnergyChange: percentageChangeCalculationSchema,
    equipmentContributions: z.array(equipmentContributionCalculationSchema).min(1),
    operatingHoursDelta: operatingHoursDeltaCalculationSchema
  }),
  hypotheses: z.array(electricalHypothesisSchema).min(1),
  unknowns: z.array(scenarioUnknownSchema).min(1),
  recommendedChecks: z.array(recommendedCheckSchema).min(1),
  confidence: analysisConfidenceSchema
});

export const claimTypeSchema = z.enum(['fact', 'calculation', 'hypothesis', 'unknown']);

export const experienceClaimSchema = z
  .object({
    text: z.string().min(1),
    claimType: claimTypeSchema,
    evidenceRefs: z.array(z.string().min(1)).min(1),
    uncertaintyNote: z.string().min(1).optional()
  })
  .superRefine((claim, context) => {
    if (
      (claim.claimType === 'hypothesis' || claim.claimType === 'unknown') &&
      !claim.uncertaintyNote
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['uncertaintyNote'],
        message: 'Hypothesis and unknown claims must state their uncertainty.'
      });
    }
  });

export const experienceEvidenceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  visible: z.boolean(),
  sourceRefs: z.array(z.string().min(1)).min(1)
});

export const experienceActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  autonomyMode: autonomyModeSchema,
  axStage: axStageSchema,
  reversible: z.boolean(),
  changesEquipmentState: z.boolean(),
  evidenceRefs: z.array(z.string().min(1)).min(1)
});

export const hiddenDetailSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  reasonHidden: z.string().min(1),
  priority: z.enum(['supporting', 'technical']),
  sourceRefs: z.array(z.string().min(1)).min(1)
});

export const axCapabilitySchema = z.enum([
  'analyze_energy_data',
  'compare_periods',
  'explain_evidence',
  'recommend_check',
  'change_schedule',
  'control_equipment'
]);

export const experienceRecommendationSchema = z.object({
  scenarioId: z.string().min(1),
  primaryMessage: experienceClaimSchema,
  explanation: z.object({
    summary: experienceClaimSchema,
    claims: z.array(experienceClaimSchema).min(1)
  }),
  evidence: z.array(experienceEvidenceSchema).min(1),
  primaryAction: experienceActionSchema,
  secondaryActions: z.array(experienceActionSchema).max(2),
  hiddenDetails: z.array(hiddenDetailSchema).min(1),
  trustElements: z.object({
    confidence: z.object({
      score: z.number().min(0).max(100),
      label: validationConfidenceSchema,
      text: z.string().min(1),
      sourceRefs: z.array(z.string().min(1)).min(1)
    }),
    uncertainty: z.object({
      text: z.string().min(1),
      sourceRefs: z.array(z.string().min(1)).min(1)
    }),
    evidenceBasis: z.object({
      text: z.string().min(1),
      sourceRefs: z.array(z.string().min(1)).min(1)
    }),
    autonomyBoundary: z.object({
      text: z.string().min(1),
      allowedModes: z.array(autonomyModeSchema).min(1),
      prohibitedCapabilities: z.array(axCapabilitySchema).min(1)
    })
  })
});

export const axRecommendationSchema = z.object({
  scenarioId: z.string().min(1),
  stagePath: z.tuple([
    z.literal('SEE'),
    z.literal('UNDERSTAND'),
    z.literal('PLAN'),
    z.literal('ACT'),
    z.literal('VERIFY')
  ]),
  currentStage: axStageSchema,
  recommendedStage: axStageSchema,
  selectedAutonomy: autonomyModeSchema,
  allowedAutonomyModes: z.array(autonomyModeSchema).min(1),
  aiCan: z.array(axCapabilitySchema).min(1),
  aiCannot: z.array(axCapabilitySchema).min(1),
  suggestedNextStep: experienceActionSchema,
  verification: z.object({
    stage: z.literal('VERIFY'),
    successCriteria: z.array(z.string().min(1)).min(1),
    evidenceRefs: z.array(z.string().min(1)).min(1)
  })
});

const scenario001AllowedModeSet = new Set<string>(SCENARIO_001_ALLOWED_AUTONOMY_MODES);

export const scenario001AxRecommendationSchema = axRecommendationSchema.superRefine(
  (recommendation, context) => {
    const modesToValidate = [
      ...recommendation.allowedAutonomyModes,
      recommendation.selectedAutonomy,
      recommendation.suggestedNextStep.autonomyMode
    ];

    for (const mode of modesToValidate) {
      if (!scenario001AllowedModeSet.has(mode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['allowedAutonomyModes'],
          message:
            'Scenario 001 is restricted to Assist, Investigate, and Recommend autonomy.'
        });
        break;
      }
    }
  }
);

export const criticCheckIdSchema = z.enum([
  'unsupported_claims',
  'evidence_visibility',
  'progressive_disclosure',
  'uncertainty',
  'autonomy_safety'
]);

export const criticCheckSchema = z.object({
  id: criticCheckIdSchema,
  status: validationStatusSchema,
  severity: validationSeveritySchema,
  confidence: validationConfidenceSchema,
  evidence: z.array(z.string().min(1)).min(1),
  recommendation: z.string().min(1)
});

export const criticResultSchema = z.object({
  criticId: z.enum(['electrical', 'experience-ax']),
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  checks: z.array(criticCheckSchema).min(1)
});

export const criticSuiteResultSchema = z.object({
  passed: z.boolean(),
  results: z.tuple([criticResultSchema, criticResultSchema])
});

export type AxStage = z.infer<typeof axStageSchema>;
export type AutonomyMode = z.infer<typeof autonomyModeSchema>;
export type AxCapability = z.infer<typeof axCapabilitySchema>;
export type ElectricalScenario = z.infer<typeof electricalScenarioSchema>;
export type ElectricalAnalysis = z.infer<typeof electricalAnalysisSchema>;
export type PercentageChangeCalculation = z.infer<
  typeof percentageChangeCalculationSchema
>;
export type EquipmentContributionCalculation = z.infer<
  typeof equipmentContributionCalculationSchema
>;
export type OperatingHoursDeltaCalculation = z.infer<
  typeof operatingHoursDeltaCalculationSchema
>;
export type ExperienceClaim = z.infer<typeof experienceClaimSchema>;
export type ExperienceRecommendation = z.infer<typeof experienceRecommendationSchema>;
export type ExperienceAction = z.infer<typeof experienceActionSchema>;
export type AxRecommendation = z.infer<typeof axRecommendationSchema>;
export type CriticCheckId = z.infer<typeof criticCheckIdSchema>;
export type CriticCheck = z.infer<typeof criticCheckSchema>;
export type CriticResult = z.infer<typeof criticResultSchema>;
export type CriticSuiteResult = z.infer<typeof criticSuiteResultSchema>;
