import { Platform } from 'react-native';
import type {
  UserProfile,
  WeightLog,
  FoodLog,
  WaterLog,
  MedicationLog,
  SideEffectLog,
  Preferences,
} from '@/store/types';
import { displayWeight, getWeightUnit, formatHeight } from '@/utils/units';
import type { UnitSystem } from '@/utils/units';

/** Escape a value for safe CSV inclusion */
function escapeCsv(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // Wrap in quotes if value contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCsv(headers: string[], rows: (string | number | undefined | null)[][]): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function generateUserProfileCsv(
  profile: UserProfile,
  preferences: Preferences,
  units: UnitSystem
): string {
  const wUnit = getWeightUnit(units);
  const rows: [string, string][] = [
    ['Medication', profile.medication ?? ''],
    ['Dose', profile.dose ?? ''],
    ['Delivery Type', profile.deliveryType ?? ''],
    ['Frequency', profile.frequency ?? ''],
    ['Start Date', profile.startDate ?? ''],
    ['Height', profile.height ? formatHeight(profile.height, units) : ''],
    ['Start Weight', profile.startWeight ? `${displayWeight(profile.startWeight, units).toFixed(1)} ${wUnit}` : ''],
    ['Current Weight', profile.currentWeight ? `${displayWeight(profile.currentWeight, units).toFixed(1)} ${wUnit}` : ''],
    ['Goal Weight', profile.goalWeight ? `${displayWeight(profile.goalWeight, units).toFixed(1)} ${wUnit}` : ''],
    ['Activity Level', profile.activityLevel ?? ''],
    ['Units', preferences.units ?? 'imperial'],
  ];
  return arrayToCsv(['Field', 'Value'], rows);
}

function generateWeightLogsCsv(logs: WeightLog[], units: UnitSystem): string {
  const wUnit = getWeightUnit(units);
  const headers = ['Date', `Weight (${wUnit})`, 'Notes'];
  const rows = logs.map((log) => [
    log.date,
    displayWeight(log.weight, units).toFixed(1),
    log.notes ?? '',
  ]);
  return arrayToCsv(headers, rows);
}

function generateFoodLogsCsv(logs: FoodLog[]): string {
  const headers = ['Date', 'Meal Type', 'Description', 'Calories', 'Protein (g)', 'Fiber (g)', 'Carbs (g)', 'Fat (g)'];
  const rows = logs.map((log) => [
    log.date,
    log.mealType,
    log.aiDescription ?? '',
    log.calories,
    log.protein,
    log.fiber,
    log.carbs ?? '',
    log.fat ?? '',
  ]);
  return arrayToCsv(headers, rows);
}

function generateMedicationLogsCsv(logs: MedicationLog[]): string {
  const headers = ['Date', 'Time', 'Dose', 'Delivery Type', 'Injection Site', 'Notes'];
  const rows = logs.map((log) => [
    log.date,
    log.time,
    log.dose,
    log.deliveryType,
    log.injectionSite ?? '',
    log.notes ?? '',
  ]);
  return arrayToCsv(headers, rows);
}

function generateSideEffectLogsCsv(logs: SideEffectLog[]): string {
  const headers = ['Date', 'Effect Type', 'Severity (1-5)', 'Notes'];
  const rows = logs.map((log) => [
    log.date,
    log.effectType,
    log.severity,
    log.notes ?? '',
  ]);
  return arrayToCsv(headers, rows);
}

function generateWaterLogsCsv(logs: WaterLog[]): string {
  const headers = ['Date', 'Glasses'];
  const rows = logs.map((log) => [log.date, log.glasses]);
  return arrayToCsv(headers, rows);
}

export interface ExportDataParams {
  userProfile: UserProfile;
  preferences: Preferences;
  weightLogs: WeightLog[];
  foodLogs: FoodLog[];
  waterLogs: WaterLog[];
  medicationLogs: MedicationLog[];
  sideEffectLogs: SideEffectLog[];
}

/** Generate a single combined CSV string with all user data separated by section markers */
export function generateCombinedCsv(params: ExportDataParams): string {
  const units = (params.preferences.units ?? 'imperial') as UnitSystem;
  const exportDate = new Date().toISOString().split('T')[0];

  const sections = [
    `SLIMSY DATA EXPORT — ${exportDate}`,
    '',
    '=== USER PROFILE ===',
    generateUserProfileCsv(params.userProfile, params.preferences, units),
    '',
    '=== WEIGHT LOGS ===',
    generateWeightLogsCsv(params.weightLogs, units),
    '',
    '=== FOOD LOGS ===',
    generateFoodLogsCsv(params.foodLogs),
    '',
    '=== MEDICATION LOGS ===',
    generateMedicationLogsCsv(params.medicationLogs),
    '',
    '=== SIDE EFFECT LOGS ===',
    generateSideEffectLogsCsv(params.sideEffectLogs),
    '',
    '=== WATER LOGS ===',
    generateWaterLogsCsv(params.waterLogs),
  ];

  return sections.join('\n');
}

/** Web: trigger a browser file download */
function downloadCsvWeb(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Native: write to file system and open native share sheet */
async function shareCsvNative(csvContent: string, filename: string): Promise<void> {
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const { isAvailableAsync, shareAsync } = require('expo-sharing') as typeof import('expo-sharing');

  const file = new File(Paths.cache, filename);
  file.write(csvContent);

  const canShare = await isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }

  await shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export My Data',
    UTI: 'public.comma-separated-values-text',
  });
}

/** Export user data as CSV — uses share sheet on native, browser download on web */
export async function exportDataAsCsv(params: ExportDataParams): Promise<void> {
  const csvContent = generateCombinedCsv(params);
  const date = new Date().toISOString().split('T')[0];
  const filename = `slimsy-data-export-${date}.csv`;

  if (Platform.OS === 'web') {
    downloadCsvWeb(csvContent, filename);
  } else {
    await shareCsvNative(csvContent, filename);
  }
}
