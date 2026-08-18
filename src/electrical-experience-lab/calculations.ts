import {
  equipmentContributionCalculationSchema,
  operatingHoursDeltaCalculationSchema,
  percentageChangeCalculationSchema,
  type EquipmentContributionCalculation,
  type OperatingHoursDeltaCalculation,
  type PercentageChangeCalculation
} from './schemas.js';

const round = (value: number, decimalPlaces = 1): number => {
  const factor = 10 ** decimalPlaces;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const requireFiniteNonNegative = (label: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative number.`);
  }
};

export const calculatePercentageChange = ({
  id,
  baselineKwh,
  currentKwh
}: {
  id: string;
  baselineKwh: number;
  currentKwh: number;
}): PercentageChangeCalculation => {
  requireFiniteNonNegative('baselineKwh', baselineKwh);
  requireFiniteNonNegative('currentKwh', currentKwh);
  if (baselineKwh === 0) {
    throw new RangeError('baselineKwh must be greater than zero for percentage change.');
  }

  const deltaKwh = round(currentKwh - baselineKwh);
  return percentageChangeCalculationSchema.parse({
    id,
    baselineKwh,
    currentKwh,
    deltaKwh,
    percentChange: round((deltaKwh / baselineKwh) * 100)
  });
};

export const calculateEquipmentContribution = ({
  id,
  equipmentId,
  label,
  baselineKwh,
  currentKwh,
  totalEnergyDeltaKwh
}: {
  id: string;
  equipmentId: EquipmentContributionCalculation['equipmentId'];
  label: string;
  baselineKwh: number;
  currentKwh: number;
  totalEnergyDeltaKwh: number;
}): EquipmentContributionCalculation => {
  requireFiniteNonNegative('baselineKwh', baselineKwh);
  requireFiniteNonNegative('currentKwh', currentKwh);
  if (baselineKwh === 0) {
    throw new RangeError('baselineKwh must be greater than zero for equipment contribution.');
  }
  if (!Number.isFinite(totalEnergyDeltaKwh) || totalEnergyDeltaKwh === 0) {
    throw new RangeError('totalEnergyDeltaKwh must be finite and non-zero.');
  }

  const deltaKwh = round(currentKwh - baselineKwh);
  return equipmentContributionCalculationSchema.parse({
    id,
    equipmentId,
    label,
    baselineKwh,
    currentKwh,
    deltaKwh,
    percentChange: round((deltaKwh / baselineKwh) * 100),
    shareOfTotalIncreasePercent: round((deltaKwh / totalEnergyDeltaKwh) * 100)
  });
};

export const calculateOperatingHoursDelta = ({
  id,
  equipmentId,
  baselineHoursPerDay,
  currentHoursPerDay
}: {
  id: string;
  equipmentId: OperatingHoursDeltaCalculation['equipmentId'];
  baselineHoursPerDay: number;
  currentHoursPerDay: number;
}): OperatingHoursDeltaCalculation => {
  requireFiniteNonNegative('baselineHoursPerDay', baselineHoursPerDay);
  requireFiniteNonNegative('currentHoursPerDay', currentHoursPerDay);

  return operatingHoursDeltaCalculationSchema.parse({
    id,
    equipmentId,
    baselineHoursPerDay,
    currentHoursPerDay,
    deltaHoursPerDay: round(currentHoursPerDay - baselineHoursPerDay)
  });
};
