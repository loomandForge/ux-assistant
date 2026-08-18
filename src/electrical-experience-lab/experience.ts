import {
  experienceRecommendationSchema,
  type ElectricalAnalysis,
  type EquipmentContributionCalculation,
  type ExperienceRecommendation
} from './schemas.js';

const findEquipmentCalculation = (
  analysis: ElectricalAnalysis,
  equipmentId: EquipmentContributionCalculation['equipmentId']
): EquipmentContributionCalculation => {
  const calculation = analysis.calculations.equipmentContributions.find(
    item => item.equipmentId === equipmentId
  );
  if (!calculation) {
    throw new Error(`Missing equipment contribution for ${equipmentId}.`);
  }
  return calculation;
};

export const buildExperienceRecommendation = (
  analysis: ElectricalAnalysis
): ExperienceRecommendation => {
  const total = analysis.calculations.totalEnergyChange;
  const hvac = findEquipmentCalculation(analysis, 'hvac');
  const lighting = findEquipmentCalculation(analysis, 'lighting');
  const otherLoads = findEquipmentCalculation(analysis, 'other-loads');
  const hours = analysis.calculations.operatingHoursDelta;
  const hypothesis = analysis.hypotheses[0];
  const unknown = analysis.unknowns[0];
  const recommendedCheck = analysis.recommendedChecks[0];

  if (!hypothesis || !unknown || !recommendedCheck) {
    throw new Error('Analysis requires a hypothesis, unknown, and recommended check.');
  }

  return experienceRecommendationSchema.parse({
    scenarioId: analysis.scenarioId,
    primaryMessage: {
      text:
        `Energy use increased ${total.percentChange}%. ` +
        `HVAC accounts for ${hvac.shareOfTotalIncreasePercent}% of the measured increase.`,
      claimType: 'calculation',
      evidenceRefs: [total.id, hvac.id]
    },
    explanation: {
      summary: {
        text:
          'HVAC is the dominant measured contributor, and its longer operating time warrants investigation.',
        claimType: 'calculation',
        evidenceRefs: [hvac.id, hours.id]
      },
      claims: [
        {
          text:
            `HVAC energy rose ${hvac.percentChange}% and operating time increased ` +
            `${hours.deltaHoursPerDay} hours per day.`,
          claimType: 'calculation',
          evidenceRefs: [hvac.id, hours.id]
        },
        {
          text:
            'The longer operating time may be contributing to the HVAC increase, but it does not establish the cause.',
          claimType: 'hypothesis',
          evidenceRefs: [hypothesis.id, hvac.id, hours.id],
          uncertaintyNote: hypothesis.limitation
        },
        {
          text: unknown.statement,
          claimType: 'unknown',
          evidenceRefs: [unknown.id],
          uncertaintyNote: 'No cause is asserted until the schedule records are checked.'
        }
      ]
    },
    evidence: [
      {
        id: 'evidence.total-energy-change',
        label: 'Total energy',
        value: `+${total.percentChange}% (${total.deltaKwh} kWh)`,
        visible: true,
        sourceRefs: [total.id]
      },
      {
        id: 'evidence.hvac-contribution',
        label: 'HVAC contribution',
        value:
          `+${hvac.percentChange}% energy; ` +
          `${hvac.shareOfTotalIncreasePercent}% of total increase`,
        visible: true,
        sourceRefs: [hvac.id]
      },
      {
        id: 'evidence.hvac-operating-hours',
        label: 'HVAC operating time',
        value: `+${hours.deltaHoursPerDay} hours/day`,
        visible: true,
        sourceRefs: [hours.id]
      },
      {
        id: 'evidence.working-hypothesis',
        label: 'Working hypothesis',
        value: 'Longer HVAC operating time may be contributing',
        visible: true,
        sourceRefs: [hypothesis.id]
      },
      {
        id: 'evidence.schedule-change-reason',
        label: 'Schedule-change reason',
        value: 'Unknown',
        visible: true,
        sourceRefs: [unknown.id]
      }
    ],
    primaryAction: {
      id: 'action.investigate-hvac-schedule',
      label: 'Investigate HVAC schedule',
      description: recommendedCheck.label,
      autonomyMode: 'Investigate',
      axStage: 'PLAN',
      reversible: true,
      changesEquipmentState: false,
      evidenceRefs: [recommendedCheck.id, unknown.id, hours.id]
    },
    secondaryActions: [
      {
        id: 'action.view-energy-evidence',
        label: 'View calculation evidence',
        description: 'Review the baseline, current readings, and contribution calculations.',
        autonomyMode: 'Assist',
        axStage: 'UNDERSTAND',
        reversible: true,
        changesEquipmentState: false,
        evidenceRefs: [total.id, hvac.id, hours.id]
      }
    ],
    hiddenDetails: [
      {
        label: 'Lighting change',
        value: `+${lighting.percentChange}% (${lighting.deltaKwh} kWh)`,
        reasonHidden: 'Supporting load detail is not needed to understand the primary increase.',
        priority: 'supporting',
        sourceRefs: [lighting.id]
      },
      {
        label: 'Other-load change',
        value: `+${otherLoads.percentChange}% (${otherLoads.deltaKwh} kWh)`,
        reasonHidden: 'Supporting load detail is available on demand.',
        priority: 'supporting',
        sourceRefs: [otherLoads.id]
      },
      {
        label: 'Raw total-energy readings',
        value: `${total.baselineKwh} kWh → ${total.currentKwh} kWh`,
        reasonHidden: 'Raw readings support the headline calculation but are secondary detail.',
        priority: 'technical',
        sourceRefs: ['fact.total-energy-readings']
      }
    ],
    trustElements: {
      confidence: {
        score: analysis.confidence.score,
        label: analysis.confidence.level,
        text: analysis.confidence.rationale,
        sourceRefs: [total.id, hvac.id, hours.id]
      },
      uncertainty: {
        text:
          'Extended HVAC operation is a working hypothesis; the reason for the schedule change is still unknown.',
        sourceRefs: [hypothesis.id, unknown.id]
      },
      evidenceBasis: {
        text: 'The recommendation uses measured weekly energy and HVAC operating-hours comparisons.',
        sourceRefs: [
          'fact.total-energy-readings',
          'fact.energy-readings.hvac',
          'fact.operating-hours.hvac'
        ]
      },
      autonomyBoundary: {
        text: 'AI may assist, investigate, and recommend; it may not change schedules or control equipment.',
        allowedModes: ['Assist', 'Investigate', 'Recommend'],
        prohibitedCapabilities: ['change_schedule', 'control_equipment']
      }
    }
  });
};
