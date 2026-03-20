export interface Preferences {
  units?: 'imperial' | 'metric';
  notifications?: boolean;
  waterReminders?: boolean;
  doseReminders?: boolean;
}

export type MedicationType =
  | 'Wegovy'
  | 'Ozempic'
  | 'Zepbound'
  | 'Mounjaro'
  | 'Semaglutide'
  | 'Tirzepatide'
  | 'Other'
  | "I don't know";

export type DeliveryType = 'injection' | 'pill' | 'not_sure';

export type Frequency =
  | 'every_7_days'
  | 'every_14_days'
  | 'daily'
  | 'custom'
  | 'not_sure';

export type DeviceType =
  | 'single_use_pen'
  | 'auto_injector'
  | 'syringe_vial'
  | 'other';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'active'
  | 'very_active';

export type Motivation =
  | 'improve_health'
  | 'loved_ones'
  | 'feel_good_clothes'
  | 'confidence'
  | 'boost_energy';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type InjectionSite =
  | 'abdomen_left'
  | 'abdomen_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'upper_arm_left'
  | 'upper_arm_right';

export type SideEffectType =
  | 'nausea'
  | 'heartburn'
  | 'fatigue'
  | 'hair_loss'
  | 'constipation'
  | 'muscle_loss'
  | 'injection_anxiety'
  | 'loose_skin'
  | 'other';

export interface UserProfile {
  name?: string;
  medication?: MedicationType;
  deliveryType?: DeliveryType;
  dose?: string;
  frequency?: Frequency;
  customFrequencyDays?: number;
  deviceType?: DeviceType;
  height?: number;
  heightUnit?: 'cm' | 'ft';
  heightFeet?: number;
  heightInches?: number;
  currentWeight?: number;
  startWeight?: number;
  goalWeight?: number;
  startDate?: string; // ISO date
  activityLevel?: ActivityLevel;
  motivation?: Motivation;
  initialSideEffects?: string[];
  cravingsDays?: string[];
  weeklyGoal?: number; // lbs per week
  onboardingComplete?: boolean;
  disclaimerAccepted?: boolean;
}

export interface WeightLog {
  id: string;
  date: string;
  weight: number;
  notes?: string;
}

export interface FoodLog {
  id: string;
  date: string;
  mealType: MealType;
  photoUri?: string;
  aiDescription?: string;
  calories: number;
  protein: number;
  fiber: number;
  carbs?: number;
  fat?: number;
  manualOverride?: boolean;
}

export interface WaterLog {
  id: string;
  date: string;
  glasses: number;
}

export interface MedicationLog {
  id: string;
  date: string;
  time: string;
  dose: string;
  deliveryType: DeliveryType;
  injectionSite?: InjectionSite;
  notes?: string;
}

export interface SideEffectLog {
  id: string;
  date: string;
  effectType: SideEffectType;
  severity: number; // 1-5
  notes?: string;
}

export interface DailyTargets {
  calories: number;
  protein: number;
  fiber: number;
  water: number;
}
