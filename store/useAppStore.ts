import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Preferences,
  UserProfile,
  WeightLog,
  FoodLog,
  WaterLog,
  MedicationLog,
  SideEffectLog,
  DailyTargets,
} from './types';

interface AppState {
  preferences: Preferences;
  userProfile: UserProfile;
  weightLogs: WeightLog[];
  foodLogs: FoodLog[];
  waterLogs: WaterLog[];
  medicationLogs: MedicationLog[];
  sideEffectLogs: SideEffectLog[];
  dailyTargets: DailyTargets;

  // Profile actions
  setPreferences: (p: Partial<Preferences>) => void;
  setUserProfile: (p: Partial<UserProfile>) => void;
  setPremiumStatus: (isPremium: boolean) => void;
  completeOnboarding: () => void;

  // Weight actions
  addWeightLog: (log: WeightLog) => void;
  deleteWeightLog: (id: string) => void;

  // Food actions
  addFoodLog: (log: FoodLog) => void;
  updateFoodLog: (id: string, updates: Partial<FoodLog>) => void;
  deleteFoodLog: (id: string) => void;

  // Water actions
  setWaterForDate: (date: string, glasses: number) => void;

  // Medication actions
  addMedicationLog: (log: MedicationLog) => void;
  deleteMedicationLog: (id: string) => void;

  // Side effect actions
  addSideEffectLog: (log: SideEffectLog) => void;
  deleteSideEffectLog: (id: string) => void;

  // Targets
  setDailyTargets: (t: Partial<DailyTargets>) => void;

  // Reset
  resetStore: () => void;
}

const defaultTargets: DailyTargets = {
  calories: 1400,
  protein: 100,
  fiber: 25,
  water: 8,
};

const initialState = {
  preferences: { units: 'imperial' as const, notifications: true },
  userProfile: { isPremium: false },
  weightLogs: [],
  foodLogs: [],
  waterLogs: [],
  medicationLogs: [],
  sideEffectLogs: [],
  dailyTargets: defaultTargets,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setPreferences: (p) =>
        set((s) => ({ preferences: { ...s.preferences, ...p } })),

      setUserProfile: (p) =>
        set((s) => ({ userProfile: { ...s.userProfile, ...p } })),

      setPremiumStatus: (isPremium) => 
        set((s) => ({ userProfile: { ...s.userProfile, isPremium } })),

      completeOnboarding: () =>
        set((s) => ({
          userProfile: { ...s.userProfile, onboardingComplete: true },
        })),

      addWeightLog: (log) =>
        set((s) => ({
          weightLogs: [log, ...s.weightLogs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
        })),
      deleteWeightLog: (id) =>
        set((s) => ({ weightLogs: s.weightLogs.filter((l) => l.id !== id) })),

      addFoodLog: (log) =>
        set((s) => ({ foodLogs: [log, ...s.foodLogs] })),
      updateFoodLog: (id, updates) =>
        set((s) => ({
          foodLogs: s.foodLogs.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        })),
      deleteFoodLog: (id) =>
        set((s) => ({ foodLogs: s.foodLogs.filter((l) => l.id !== id) })),

      setWaterForDate: (date, glasses) =>
        set((s) => {
          const existing = s.waterLogs.findIndex((l) => l.date === date);
          if (existing >= 0) {
            const updated = [...s.waterLogs];
            updated[existing] = { ...updated[existing], glasses };
            return { waterLogs: updated };
          }
          return {
            waterLogs: [
              ...s.waterLogs,
              { id: Date.now().toString(), date, glasses },
            ],
          };
        }),

      addMedicationLog: (log) =>
        set((s) => ({
          medicationLogs: [log, ...s.medicationLogs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
        })),
      deleteMedicationLog: (id) =>
        set((s) => ({
          medicationLogs: s.medicationLogs.filter((l) => l.id !== id),
        })),

      addSideEffectLog: (log) =>
        set((s) => ({
          sideEffectLogs: [log, ...s.sideEffectLogs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          ),
        })),
      deleteSideEffectLog: (id) =>
        set((s) => ({
          sideEffectLogs: s.sideEffectLogs.filter((l) => l.id !== id),
        })),

      setDailyTargets: (t) =>
        set((s) => ({ dailyTargets: { ...s.dailyTargets, ...t } })),

      resetStore: () => set(initialState),
    }),
    {
      name: 'slimsy-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export type AppStore = AppState;
