import {
  electricalScenarioSchema,
  SCENARIO_001_ALLOWED_AUTONOMY_MODES,
  type ElectricalScenario
} from './schemas.js';

export const scenario001: ElectricalScenario = electricalScenarioSchema.parse({
  scenarioId: 'scenario-001',
  title: 'Energy consumption increased 18%',
  baseline: {
    label: 'Previous week',
    totalEnergyKwh: 1000,
    equipmentEnergyKwh: {
      hvac: 400,
      lighting: 200,
      otherLoads: 400
    },
    hvacOperatingHoursPerDay: 8
  },
  current: {
    label: 'Current week',
    totalEnergyKwh: 1180,
    equipmentEnergyKwh: {
      hvac: 564,
      lighting: 204,
      otherLoads: 412
    },
    hvacOperatingHoursPerDay: 11.1
  },
  knownUnknowns: [
    {
      id: 'unknown.hvac-schedule-change-reason',
      statement: 'The reason for the HVAC schedule change is unknown.'
    }
  ],
  allowedAutonomyModes: [...SCENARIO_001_ALLOWED_AUTONOMY_MODES]
});
