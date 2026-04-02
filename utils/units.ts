const LBS_TO_KG = 0.453592;
const KG_TO_LBS = 2.20462;
const IN_TO_CM = 2.54;

export type UnitSystem = 'imperial' | 'metric';

/** Convert weight from lbs (canonical storage) to display unit */
export function displayWeight(lbs: number, units: UnitSystem): number {
  return units === 'metric' ? lbs * LBS_TO_KG : lbs;
}

/** Convert weight from display unit to lbs (canonical storage) */
export function toLbs(value: number, units: UnitSystem): number {
  return units === 'metric' ? value * KG_TO_LBS : value;
}

/** Format weight value from storage (lbs) to display string */
export function formatWeightValue(
  lbs: number,
  units: UnitSystem,
  decimals = 1
): string {
  return displayWeight(lbs, units).toFixed(decimals);
}

/** Get the weight unit label */
export function getWeightUnit(units: UnitSystem): string {
  return units === 'metric' ? 'kg' : 'lbs';
}

/** Format height from cm to display string */
export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === 'metric') {
    return `${Math.round(cm)} cm`;
  }
  const totalInches = cm / IN_TO_CM;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

/** Calculate BMI from stored weight (lbs) and height (cm) */
export function calculateBMI(weightLbs: number, heightCm: number): number {
  const weightKg = weightLbs * LBS_TO_KG;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** Convert weekly goal between unit systems with snap values */
export function convertWeeklyGoal(
  value: number,
  fromUnit: 'lbs' | 'kg',
  toUnit: 'lbs' | 'kg'
): number {
  if (fromUnit === toUnit) return value;
  if (toUnit === 'kg') {
    const converted = value * LBS_TO_KG;
    return Math.max(0.25, Math.min(1.0, Math.round(converted / 0.25) * 0.25));
  }
  const converted = value * KG_TO_LBS;
  return Math.max(0.5, Math.min(2.5, Math.round(converted / 0.5) * 0.5));
}
