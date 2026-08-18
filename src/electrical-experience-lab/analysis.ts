import {
  calculateEquipmentContribution,
  calculateOperatingHoursDelta,
  calculatePercentageChange
} from './calculations.js';
import {
  electricalAnalysisSchema,
  type ElectricalAnalysis,
  type ElectricalScenario,
  type EquipmentContributionCalculation
} from './schemas.js';

type EquipmentDefinition = {
  equipmentId: EquipmentContributionCalculation['equipmentId'];
  label: string;
  baselineKwh: number;
  currentKwh: number;
  sourcePath: string;
};

export const analyzeElectricalScenario = (
  scenario: ElectricalScenario
): ElectricalAnalysis => {
  const totalEnergyChange = calculatePercentageChange({
    id: 'calc.total-energy-change',
    baselineKwh: scenario.baseline.totalEnergyKwh,
    currentKwh: scenario.current.totalEnergyKwh
  });

  const equipment: EquipmentDefinition[] = [
    {
      equipmentId: 'hvac',
      label: 'HVAC',
      baselineKwh: scenario.baseline.equipmentEnergyKwh.hvac,
      currentKwh: scenario.current.equipmentEnergyKwh.hvac,
      sourcePath: 'baseline/current.equipmentEnergyKwh.hvac'
    },
    {
      equipmentId: 'lighting',
      label: 'Lighting',
      baselineKwh: scenario.baseline.equipmentEnergyKwh.lighting,
      currentKwh: scenario.current.equipmentEnergyKwh.lighting,
      sourcePath: 'baseline/current.equipmentEnergyKwh.lighting'
    },
    {
      equipmentId: 'other-loads',
      label: 'Other loads',
      baselineKwh: scenario.baseline.equipmentEnergyKwh.otherLoads,
      currentKwh: scenario.current.equipmentEnergyKwh.otherLoads,
      sourcePath: 'baseline/current.equipmentEnergyKwh.otherLoads'
    }
  ];

  const equipmentContributions = equipment.map(item =>
    calculateEquipmentContribution({
      id: `calc.equipment-contribution.${item.equipmentId}`,
      equipmentId: item.equipmentId,
      label: item.label,
      baselineKwh: item.baselineKwh,
      currentKwh: item.currentKwh,
      totalEnergyDeltaKwh: totalEnergyChange.deltaKwh
    })
  );

  const operatingHoursDelta = calculateOperatingHoursDelta({
    id: 'calc.operating-hours-delta.hvac',
    equipmentId: 'hvac',
    baselineHoursPerDay: scenario.baseline.hvacOperatingHoursPerDay,
    currentHoursPerDay: scenario.current.hvacOperatingHoursPerDay
  });

  const hypothesisId = 'hypothesis.extended-hvac-operation';
  const unknownId = scenario.knownUnknowns[0]?.id;
  if (!unknownId) {
    throw new Error('Electrical scenario requires a known unknown for recommended checks.');
  }

  return electricalAnalysisSchema.parse({
    scenarioId: scenario.scenarioId,
    facts: [
      {
        id: 'fact.total-energy-readings',
        statement:
          `Total energy was ${scenario.baseline.totalEnergyKwh} kWh in the baseline and ` +
          `${scenario.current.totalEnergyKwh} kWh in the current period.`,
        sourcePath: 'baseline/current.totalEnergyKwh'
      },
      ...equipment.map(item => ({
        id: `fact.energy-readings.${item.equipmentId}`,
        statement:
          `${item.label} energy was ${item.baselineKwh} kWh in the baseline and ` +
          `${item.currentKwh} kWh in the current period.`,
        sourcePath: item.sourcePath
      })),
      {
        id: 'fact.operating-hours.hvac',
        statement:
          `HVAC operated ${scenario.baseline.hvacOperatingHoursPerDay} hours per day in the ` +
          `baseline and ${scenario.current.hvacOperatingHoursPerDay} hours per day currently.`,
        sourcePath: 'baseline/current.hvacOperatingHoursPerDay'
      }
    ],
    calculations: {
      totalEnergyChange,
      equipmentContributions,
      operatingHoursDelta
    },
    hypotheses: [
      {
        id: hypothesisId,
        statement:
          'Longer HVAC operating time may be contributing to the measured HVAC energy increase.',
        supportedBy: [
          'calc.equipment-contribution.hvac',
          operatingHoursDelta.id
        ],
        confidence: 'medium',
        limitation:
          'The measurements show correlation, not why the operating schedule changed or whether it is the sole cause.'
      }
    ],
    unknowns: scenario.knownUnknowns,
    recommendedChecks: [
      {
        id: 'check.compare-hvac-schedule',
        label: 'Compare the HVAC schedule with the previous week',
        rationale:
          'Confirm when the extra operating hours occurred before considering any schedule change.',
        evidenceRefs: [
          'calc.equipment-contribution.hvac',
          operatingHoursDelta.id,
          hypothesisId
        ],
        resolvesUnknowns: [unknownId]
      }
    ],
    confidence: {
      score: 82,
      level: 'high',
      rationale:
        'The energy and operating-hours comparisons are deterministic; the schedule-change reason remains unknown.'
    }
  });
};
