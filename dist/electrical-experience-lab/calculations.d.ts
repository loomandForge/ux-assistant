import { type EquipmentContributionCalculation, type OperatingHoursDeltaCalculation, type PercentageChangeCalculation } from './schemas.js';
export declare const calculatePercentageChange: ({ id, baselineKwh, currentKwh }: {
    id: string;
    baselineKwh: number;
    currentKwh: number;
}) => PercentageChangeCalculation;
export declare const calculateEquipmentContribution: ({ id, equipmentId, label, baselineKwh, currentKwh, totalEnergyDeltaKwh }: {
    id: string;
    equipmentId: EquipmentContributionCalculation["equipmentId"];
    label: string;
    baselineKwh: number;
    currentKwh: number;
    totalEnergyDeltaKwh: number;
}) => EquipmentContributionCalculation;
export declare const calculateOperatingHoursDelta: ({ id, equipmentId, baselineHoursPerDay, currentHoursPerDay }: {
    id: string;
    equipmentId: OperatingHoursDeltaCalculation["equipmentId"];
    baselineHoursPerDay: number;
    currentHoursPerDay: number;
}) => OperatingHoursDeltaCalculation;
