import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, Linking, ActivityIndicator, Alert, TextInput, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { StepWelcome } from '@/components/onboarding/step-welcome';
import { OnboardingLayout } from '@/components/onboarding/onboarding-layout';
import { PillButton } from '@/components/ui/pill-button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BodyDiagram } from '@/components/medication/body-diagram';
import { ConfettiBurst } from '@/components/ui/confetti-burst';
import type {
  MedicationType,
  DeliveryType,
  Frequency,
  DeviceType,
  ActivityLevel,
  Motivation,
  InjectionSite,
  MedicationLog,
} from '@/store/types';
import { generateId } from '@/utils/date';
import { computeOnboardingPkCurve } from '@/utils/pharmacokinetics';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { adapty } from 'react-native-adapty';
import * as StoreReview from 'expo-store-review';

const TOTAL_STEPS = 24;

const medications: MedicationType[] = [
  'Wegovy', 'Ozempic', 'Zepbound', 'Mounjaro',
  'Semaglutide', 'Tirzepatide', 'Other', "I don't know",
];

const deliveryTypes: { label: string; value: DeliveryType }[] = [
  { label: 'Injection (Shots)', value: 'injection' },
  { label: 'Pill', value: 'pill' },
  { label: 'Not sure', value: 'not_sure' },
];

const injectionDoses = ['0.25mg', '0.5mg', '1mg', '2mg', 'Other', "I don't know"];
const pillDoses = ['1.5mg', '4mg', '9mg', '25mg', 'Other', "I don't know"];

const deviceTypes: { label: string; value: DeviceType }[] = [
  { label: 'Single-use pen', value: 'single_use_pen' },
  { label: 'Auto-injector', value: 'auto_injector' },
  { label: 'Syringe & vial', value: 'syringe_vial' },
  { label: 'Other', value: 'other' },
];

const activityLevels: { label: string; value: ActivityLevel; desc: string; icon: string }[] = [
  { label: 'Sedentary', value: 'sedentary', desc: 'Little or no exercise', icon: 'bed-outline' },
  { label: 'Lightly Active', value: 'lightly_active', desc: 'Light exercise 1-3 days/week', icon: 'walk-outline' },
  { label: 'Active', value: 'active', desc: 'Moderate exercise 3-5 days/week', icon: 'bicycle-outline' },
  { label: 'Very Active', value: 'very_active', desc: 'Hard exercise 6-7 days/week', icon: 'barbell-outline' },
];

const motivations: { label: string; value: Motivation; icon: string }[] = [
  { label: 'Improve health', value: 'improve_health', icon: 'heart-outline' },
  { label: 'Show up for loved ones', value: 'loved_ones', icon: 'people-outline' },
  { label: 'Feel good in clothes', value: 'feel_good_clothes', icon: 'shirt-outline' },
  { label: 'Confidence', value: 'confidence', icon: 'star-outline' },
  { label: 'Boost energy', value: 'boost_energy', icon: 'flash-outline' },
];

const sideEffectsOptions = [
  'Nausea', 'Heartburn', 'Fatigue', 'Hair loss', 'Constipation',
  'Muscle loss', 'Injection anxiety', 'Loose skin', 'Other', 'Not concerned',
];

const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Unknown', 'Other'];

// PK model imported from utils/pharmacokinetics

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUserProfile, completeOnboarding, setPreferences, addMedicationLog, addWeightLog, weightLogs } = useAppStore();

  const [step, setStep] = useState(0);

  const [medication, setMedication] = useState<MedicationType | undefined>();
  const [deliveryType, setDeliveryType] = useState<DeliveryType | undefined>();
  const [dose, setDose] = useState<string | undefined>();
  const [frequency, setFrequency] = useState<Frequency | undefined>();
  const [deviceType, setDeviceType] = useState<DeviceType | undefined>();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [unitSystem, setUnitSystem] = useState<'imperial' | 'metric'>('imperial');
  const heightUnit = unitSystem === 'metric' ? ('cm' as const) : ('ft' as const);
  const weightUnitLabel = unitSystem === 'metric' ? 'kg' : 'lbs';
  const weeklyGoalUnit = unitSystem === 'metric' ? ('kg' as const) : ('lbs' as const);
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [goalWeight, setGoalWeight] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState(1.0);
  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>('yearly');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>();
  const [cravingsDays, setCravingsDays] = useState<string[]>([]);
  const [sideEffects, setSideEffects] = useState<string[]>([]);
  const [motivation, setMotivation] = useState<Motivation | undefined>();
  const [isRestoring, setIsRestoring] = useState(false);

  // First dose logging
  const [firstDoseDateTime, setFirstDoseDateTime] = useState(new Date());
  const [firstDoseInjectionSite, setFirstDoseInjectionSite] = useState<InjectionSite | undefined>();
  const [firstDoseNotes, setFirstDoseNotes] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  // Rating
  const [appRating, setAppRating] = useState(0);

  // Block Android hardware back button on paywall step
  useEffect(() => {
    if (step !== 23) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [step]);

  const shouldShowDeviceStep = deliveryType === 'injection';

  const getFrequencyOptions = (): { label: string; value: Frequency }[] => {
    if (deliveryType === 'injection') {
      return [
        { label: 'Every 7 days', value: 'every_7_days' },
        { label: 'Every 14 days', value: 'every_14_days' },
        { label: 'Custom', value: 'custom' },
      ];
    }
    if (deliveryType === 'pill') {
      return [
        { label: 'Daily', value: 'daily' },
        { label: 'Custom', value: 'custom' },
        { label: 'Not sure', value: 'not_sure' },
      ];
    }
    return [
      { label: 'Daily', value: 'daily' },
      { label: 'Every 7 days', value: 'every_7_days' },
      { label: 'Every 14 days', value: 'every_14_days' },
      { label: 'Custom', value: 'custom' },
      { label: 'Not sure', value: 'not_sure' },
    ];
  };

  const getDoseOptions = (): string[] => {
    if (deliveryType === 'pill') return pillDoses;
    return injectionDoses;
  };

  const handleNext = useCallback(() => {
    let nextStep = step + 1;
    if (step === 4 && !shouldShowDeviceStep) {
      nextStep = 6; // Skip device type step (step 5)
    }
    setStep(nextStep);
  }, [step, shouldShowDeviceStep]);

  const handleBack = useCallback(() => {
    let prevStep = step - 1;
    if (step === 6 && !shouldShowDeviceStep) {
      prevStep = 4;
    }
    if (prevStep >= 0) setStep(prevStep);
  }, [step, shouldShowDeviceStep]);

  const handleComplete = useCallback(() => {
    const heightVal = heightUnit === 'cm'
      ? parseFloat(heightCm) || undefined
      : ((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0)) * 2.54 || undefined;

    const parseLbs = (val: string): number | undefined => {
      const num = parseFloat(val);
      if (!num) return undefined;
      return unitSystem === 'metric' ? num / 0.453592 : num;
    };

    setPreferences({ units: unitSystem });
    setUserProfile({
      medication,
      deliveryType,
      dose,
      frequency,
      deviceType: shouldShowDeviceStep ? deviceType : undefined,
      height: heightVal,
      heightUnit,
      currentWeight: parseLbs(currentWeight),
      startWeight: parseLbs(startWeight),
      goalWeight: parseLbs(goalWeight),
      startDate: startDate.toISOString().split('T')[0],
      activityLevel,
      motivation,
      initialSideEffects: sideEffects,
      cravingsDays,
      weeklyGoal,
      weeklyGoalUnit,
      disclaimerAccepted,
      onboardingComplete: true,
    });
    completeOnboarding();

    // Create initial weight log entry from onboarding data (only if no logs exist yet)
    const currentWeightLbs = parseLbs(currentWeight);
    if (currentWeightLbs && weightLogs.length === 0) {
      const logDate = startDate.toISOString().split('T')[0];
      addWeightLog({
        id: generateId(),
        date: logDate,
        weight: currentWeightLbs,
        notes: 'Initial weight from onboarding',
      });
    }

    router.replace('/(tabs)/dashboard');
  }, [
    medication, deliveryType, dose, frequency, deviceType,
    heightUnit, heightCm, heightFt, heightIn, unitSystem,
    currentWeight, startWeight, goalWeight, startDate,
    activityLevel, motivation, sideEffects, cravingsDays,
    weeklyGoal, weeklyGoalUnit, disclaimerAccepted, shouldShowDeviceStep,
    setUserProfile, setPreferences, completeOnboarding, addWeightLog, weightLogs, router,
  ]);

  const handleRestorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      const profile = await adapty.restorePurchases();
      const isPremium = profile?.accessLevels?.['premium']?.isActive ?? false;
      if (isPremium) {
        Alert.alert(
          'Purchases Restored',
          'Your Pro subscription has been restored successfully.',
          [{ text: 'Continue', onPress: handleComplete }]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'We couldn\'t find any active subscriptions linked to your account.',
          [{ text: 'OK' }]
        );
      }
    } catch {
      Alert.alert(
        'Restore Failed',
        'Something went wrong while restoring purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRestoring(false);
    }
  }, [handleComplete]);

  const toggleCravingsDay = (day: string) => {
    setCravingsDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleSideEffect = (effect: string) => {
    setSideEffects((prev) =>
      prev.includes(effect) ? prev.filter((e) => e !== effect) : [...prev, effect]
    );
  };

  const handleLogFirstDose = useCallback(() => {
    const log: MedicationLog = {
      id: Date.now().toString(),
      date: firstDoseDateTime.toISOString().split('T')[0],
      time: `${String(firstDoseDateTime.getHours()).padStart(2, '0')}:${String(firstDoseDateTime.getMinutes()).padStart(2, '0')}`,
      dose: dose || 'Unknown',
      deliveryType: deliveryType || 'injection',
      injectionSite: shouldShowDeviceStep ? firstDoseInjectionSite : undefined,
      notes: firstDoseNotes.trim() || undefined,
    };
    addMedicationLog(log);
    setShowConfetti(true);
  }, [firstDoseDateTime, dose, deliveryType, shouldShowDeviceStep, firstDoseInjectionSite, firstDoseNotes, addMedicationLog]);

  const handleConfettiComplete = useCallback(() => {
    setShowConfetti(false);
    setStep((prev) => prev + 1);
  }, []);

  const handleStarPress = useCallback(async (rating: number) => {
    setAppRating(rating);
    if (rating >= 4) {
      try {
        const available = await StoreReview.isAvailableAsync();
        if (available) {
          await StoreReview.requestReview();
        }
      } catch {
        // Silently fail — native review prompt is best-effort
      }
    }
  }, []);

  // Memoised GLP-1 chart data based on user's medication & frequency
  const glpChartData = useMemo(() => {
    const chartW = 300;
    const chartH = 170;
    return computeOnboardingPkCurve(medication, deliveryType, frequency, chartW, chartH, 20, 16);
  }, [medication, deliveryType, frequency]);

  const getFrequencyLabel = (): string => {
    switch (frequency) {
      case 'every_7_days': return 'every 7 days';
      case 'every_14_days': return 'every 14 days';
      case 'daily': return 'daily';
      default: return 'each dose';
    }
  };


  // Step 0: Welcome
  if (step === 0) {
    return <StepWelcome onNext={handleNext} />;
  }

  // Step 1: Select Medication
  if (step === 1) {
    return (
      <OnboardingLayout
        step={1}
        totalSteps={TOTAL_STEPS}
        title="Select your GLP-1 medication"
        subtitle="Which medication are you currently taking?"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!medication}
      >
        <View style={{ gap: Spacing.md }}>
          {medications.map((med) => (
            <PillButton
              key={med}
              label={med}
              selected={medication === med}
              onPress={() => setMedication(med)}
            />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 2: How do you take it?
  if (step === 2) {
    return (
      <OnboardingLayout
        step={2}
        totalSteps={TOTAL_STEPS}
        title="How do you take it?"
        subtitle="Select your delivery method"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!deliveryType}
      >
        <View style={{ gap: Spacing.md }}>
          {deliveryTypes.map((dt) => (
            <PillButton
              key={dt.value}
              label={dt.label}
              selected={deliveryType === dt.value}
              onPress={() => setDeliveryType(dt.value)}
            />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 3: Current dose
  if (step === 3) {
    return (
      <OnboardingLayout
        step={3}
        totalSteps={TOTAL_STEPS}
        title="What's your current dose?"
        subtitle="Select the dose you're currently taking"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!dose}
      >
        <View style={{ gap: Spacing.md }}>
          {getDoseOptions().map((d) => (
            <PillButton
              key={d}
              label={d}
              selected={dose === d}
              onPress={() => setDose(d)}
            />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 4: Frequency
  if (step === 4) {
    return (
      <OnboardingLayout
        step={4}
        totalSteps={TOTAL_STEPS}
        title="How often do you take it?"
        subtitle="Select your dosing frequency"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!frequency}
      >
        <View style={{ gap: Spacing.md }}>
          {getFrequencyOptions().map((f) => (
            <PillButton
              key={f.value}
              label={f.label}
              selected={frequency === f.value}
              onPress={() => setFrequency(f.value)}
            />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 5: Device type (injection only)
  if (step === 5) {
    return (
      <OnboardingLayout
        step={5}
        totalSteps={TOTAL_STEPS}
        title="What type of device?"
        subtitle="How do you administer your injection?"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!deviceType}
      >
        <View style={{ gap: Spacing.md }}>
          {deviceTypes.map((dt) => (
            <PillButton
              key={dt.value}
              label={dt.label}
              selected={deviceType === dt.value}
              onPress={() => setDeviceType(dt.value)}
            />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 6: Health Disclaimer
  if (step === 6) {
    return (
      <OnboardingLayout
        step={6}
        totalSteps={TOTAL_STEPS}
        title="Health Disclaimer"
        subtitle="Please read carefully before continuing"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!disclaimerAccepted}
      >
        <Card style={{ gap: Spacing.lg }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: Colors.warningLight,
              justifyContent: 'center',
              alignItems: 'center',
              borderCurve: 'continuous',
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={26} color={Colors.warning} />
          </View>

          <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, lineHeight: 23 }}>
            This app is designed to help you track your GLP-1 medication journey. It is not a medical device, and the information provided should not be considered medical advice.
          </Text>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, lineHeight: 23 }}>
            Always consult your healthcare provider for medical decisions. The estimated medication levels shown are approximations and may not reflect your actual levels.
          </Text>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, lineHeight: 23 }}>
            If you experience severe side effects, contact your doctor immediately.
          </Text>

          <Pressable
            onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.sm }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                borderWidth: 2,
                borderColor: disclaimerAccepted ? Colors.primary : Colors.border,
                backgroundColor: disclaimerAccepted ? Colors.primary : 'transparent',
                justifyContent: 'center',
                alignItems: 'center',
                borderCurve: 'continuous',
              }}
            >
              {disclaimerAccepted && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text, flex: 1 }}>
              I understand this app is not medical advice
            </Text>
          </Pressable>
        </Card>
      </OnboardingLayout>
    );
  }

  // Step 7: Unit System Selection
  if (step === 7) {
    return (
      <OnboardingLayout
        step={7}
        totalSteps={TOTAL_STEPS}
        title="Choose your units"
        subtitle="This will be used throughout the app"
        onNext={handleNext}
        onBack={handleBack}
      >
        <View style={{ gap: Spacing.lg, paddingTop: Spacing.xl }}>
          {([
            { system: 'imperial' as const, title: 'Imperial', desc: 'Pounds & feet/inches', examples: 'lbs, ft/in', icon: 'speedometer-outline' as const },
            { system: 'metric' as const, title: 'Metric', desc: 'Kilograms & centimeters', examples: 'kg, cm', icon: 'globe-outline' as const },
          ]).map((option) => (
            <Pressable
              key={option.system}
              onPress={() => {
                if (option.system !== unitSystem) {
                  setUnitSystem(option.system);
                  setWeeklyGoal(option.system === 'metric' ? 0.5 : 1.0);
                }
              }}
              style={{
                flexDirection: 'row', alignItems: 'center', padding: Spacing.lg,
                borderRadius: Radius.lg, borderWidth: 2,
                borderColor: unitSystem === option.system ? Colors.primary : Colors.border,
                backgroundColor: unitSystem === option.system ? Colors.primaryLight : Colors.surface,
                gap: Spacing.lg, borderCurve: 'continuous',
              }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: unitSystem === option.system ? Colors.primary : Colors.borderLight, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous' }}>
                <Ionicons name={option.icon} size={26} color={unitSystem === option.system ? '#fff' : Colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>{option.title}</Text>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>{option.desc}</Text>
                <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textTertiary, marginTop: 4 }}>{option.examples}</Text>
              </View>
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: unitSystem === option.system ? Colors.primary : Colors.border, justifyContent: 'center', alignItems: 'center' }}>
                {unitSystem === option.system && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.primary }} />}
              </View>
            </Pressable>
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 8: Height
  if (step === 8) {
    return (
      <OnboardingLayout step={8} totalSteps={TOTAL_STEPS} title="What's your height?" onNext={handleNext} onBack={handleBack} nextDisabled={heightUnit === 'cm' ? !heightCm : !heightFt}>
        <View style={{ gap: Spacing.xxl, alignItems: 'center', paddingTop: Spacing.xxl }}>
          {heightUnit === 'cm' ? (
            <NumericInput value={heightCm} onChangeText={setHeightCm} unit="cm" large />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.lg }}>
              <NumericInput value={heightFt} onChangeText={setHeightFt} unit="ft" />
              <NumericInput value={heightIn} onChangeText={setHeightIn} unit="in" />
            </View>
          )}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 9: Current weight
  if (step === 9) {
    return (
      <OnboardingLayout step={9} totalSteps={TOTAL_STEPS} title="What's your current weight?" onNext={handleNext} onBack={handleBack} nextDisabled={!currentWeight}>
        <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
          <NumericInput value={currentWeight} onChangeText={setCurrentWeight} unit={weightUnitLabel} large />
        </View>
      </OnboardingLayout>
    );
  }

  // Step 10: Starting weight
  if (step === 10) {
    return (
      <OnboardingLayout step={10} totalSteps={TOTAL_STEPS} title="What was your starting weight?" subtitle="Your weight when you started GLP-1 medication" onNext={handleNext} onBack={handleBack} nextDisabled={!startWeight}>
        <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
          <NumericInput value={startWeight} onChangeText={setStartWeight} unit={weightUnitLabel} large />
        </View>
      </OnboardingLayout>
    );
  }

  // Step 11: Start date
  if (step === 11) {
    return (
      <OnboardingLayout step={11} totalSteps={TOTAL_STEPS} title="When did you start?" subtitle="When did you begin taking your GLP-1 medication?" onNext={handleNext} onBack={handleBack}>
        <View style={{ alignItems: 'center', paddingTop: Spacing.xl }}>
          <DateTimePicker value={startDate} mode="date" display="spinner" maximumDate={new Date()} onChange={(_, date) => { if (date) setStartDate(date); }} style={{ height: 200 }} />
        </View>
      </OnboardingLayout>
    );
  }

  // Step 12: Goal weight
  if (step === 12) {
    return (
      <OnboardingLayout step={12} totalSteps={TOTAL_STEPS} title="What's your goal weight?" subtitle="Don't worry, you can change this anytime" onNext={handleNext} onBack={handleBack} nextDisabled={!goalWeight}>
        <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
          <NumericInput value={goalWeight} onChangeText={setGoalWeight} unit={weightUnitLabel} large />
        </View>
      </OnboardingLayout>
    );
  }

  // Step 13: Goal pace (slider)
  if (step === 13) {
    const isKg = weeklyGoalUnit === 'kg';
    const sliderMin = isKg ? 0.25 : 0.5;
    const sliderMax = isKg ? 1.0 : 2.5;
    const sliderStep = isKg ? 0.25 : 0.5;
    const displayValue = isKg ? weeklyGoal.toFixed(2) : weeklyGoal.toFixed(1);
    const minLabel = isKg ? '0.25 kg' : '0.5 lbs';
    const maxLabel = isKg ? '1.0 kg' : '2.5 lbs';

    return (
      <OnboardingLayout step={13} totalSteps={TOTAL_STEPS} title="Set your pace" subtitle="How much weight would you like to lose per week?" onNext={handleNext} onBack={handleBack}>
        <View style={{ alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.xxl }}>
          <Text style={{ fontFamily: Fonts.bold, fontSize: 48, color: Colors.primary, fontVariant: ['tabular-nums'] }}>
            {displayValue} {weeklyGoalUnit}
          </Text>
          <Text style={{ fontFamily: Fonts.medium, fontSize: 16, color: Colors.textSecondary }}>per week</Text>
          <View style={{ width: '100%', paddingHorizontal: Spacing.lg }}>
            <Slider minimumValue={sliderMin} maximumValue={sliderMax} step={sliderStep} value={weeklyGoal} onValueChange={setWeeklyGoal} minimumTrackTintColor={Colors.primary} maximumTrackTintColor={Colors.borderLight} thumbTintColor={Colors.primary} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>{minLabel}</Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>{maxLabel}</Text>
            </View>
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // Step 14: Activity level
  if (step === 14) {
    return (
      <OnboardingLayout step={14} totalSteps={TOTAL_STEPS} title="Activity level" subtitle="How active are you in a typical week?" onNext={handleNext} onBack={handleBack} nextDisabled={!activityLevel}>
        <View style={{ gap: Spacing.md }}>
          {activityLevels.map((al) => (
            <Pressable key={al.value} onPress={() => setActivityLevel(al.value)} style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: activityLevel === al.value ? Colors.primary : Colors.border, backgroundColor: activityLevel === al.value ? Colors.primaryLight : Colors.surface, gap: Spacing.md, borderCurve: 'continuous' }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: activityLevel === al.value ? Colors.primary : Colors.borderLight, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous' }}>
                <Ionicons name={al.icon as keyof typeof Ionicons.glyphMap} size={22} color={activityLevel === al.value ? '#fff' : Colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>{al.label}</Text>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>{al.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 15: Tough days (informational)
  if (step === 15) {
    return (
      <OnboardingLayout step={15} totalSteps={TOTAL_STEPS} title="Tough days happen" subtitle="And that's completely normal" onNext={handleNext} onBack={handleBack}>
        <View style={{ gap: Spacing.xxl, paddingTop: Spacing.lg }}>
          <Card elevated style={{ gap: Spacing.md }}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous' }}>
              <Ionicons name="sunny-outline" size={26} color={Colors.primary} />
            </View>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.text }}>It gets easier</Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, lineHeight: 23 }}>
              Many people experience side effects and tough days in the first few weeks. Your body is adjusting to the medication. Most side effects reduce significantly over time.
            </Text>
          </Card>
          <Card style={{ gap: Spacing.md }}>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text }}>Tips for tough days:</Text>
            {['Stay hydrated - drink plenty of water', 'Eat small, frequent meals', 'Get enough rest and sleep', 'Track your side effects to share with your doctor'].map((tip, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.accent} style={{ marginTop: 2 }} />
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 20 }}>{tip}</Text>
              </View>
            ))}
          </Card>
        </View>
      </OnboardingLayout>
    );
  }

  // Step 16: Cravings day
  if (step === 16) {
    return (
      <OnboardingLayout step={16} totalSteps={TOTAL_STEPS} title="When do cravings hit?" subtitle="Select the days you tend to crave food most" onNext={handleNext} onBack={handleBack}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
          {daysOfWeek.map((day) => (
            <PillButton key={day} label={day} selected={cravingsDays.includes(day)} onPress={() => toggleCravingsDay(day)} style={{ minWidth: 80 }} />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 17: Side effects
  if (step === 17) {
    return (
      <OnboardingLayout step={17} totalSteps={TOTAL_STEPS} title="Any concerns?" subtitle="Select side effects you're experiencing or worried about" onNext={handleNext} onBack={handleBack}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
          {sideEffectsOptions.map((se) => (
            <PillButton key={se} label={se} selected={sideEffects.includes(se)} onPress={() => toggleSideEffect(se)} />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 18: Motivation
  if (step === 18) {
    return (
      <OnboardingLayout step={18} totalSteps={TOTAL_STEPS} title="What motivates you?" subtitle="Understanding your 'why' helps us support you better" onNext={handleNext} onBack={handleBack} nextDisabled={!motivation}>
        <View style={{ gap: Spacing.md }}>
          {motivations.map((m) => (
            <Pressable key={m.value} onPress={() => setMotivation(m.value)} style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: motivation === m.value ? Colors.primary : Colors.border, backgroundColor: motivation === m.value ? Colors.primaryLight : Colors.surface, gap: Spacing.md, borderCurve: 'continuous' }}>
              <Ionicons name={m.icon as keyof typeof Ionicons.glyphMap} size={24} color={motivation === m.value ? Colors.primary : Colors.textSecondary} />
              <Text style={{ fontFamily: motivation === m.value ? Fonts.semiBold : Fonts.medium, fontSize: 16, color: motivation === m.value ? Colors.primary : Colors.text }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 19: Social proof
  if (step === 19) {
    return (
      <OnboardingLayout step={19} totalSteps={TOTAL_STEPS} title="You're not alone" showProgress={false} onNext={handleNext} onBack={handleBack} nextLabel="Continue">
        <View style={{ gap: Spacing.xxl, alignItems: 'center', paddingTop: Spacing.xl }}>
          <Text style={{ fontFamily: Fonts.bold, fontSize: 42, color: Colors.primary, textAlign: 'center' }}>50,000+</Text>
          <Text style={{ fontFamily: Fonts.medium, fontSize: 17, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 }}>
            people tracking their{'\n'}GLP-1 journey with Slimsy
          </Text>
          <View style={{ gap: Spacing.lg, width: '100%', paddingTop: Spacing.lg }}>
            {[
              { name: 'Sarah M.', text: "Down 35 lbs in 4 months. Slimsy helped me stay consistent.", rating: 5 },
              { name: 'Mike R.', text: 'The injection tracker is a game-changer. Never miss a dose.', rating: 5 },
              { name: 'Jessica L.', text: 'Love the food tracking with AI. So easy to log meals!', rating: 5 },
            ].map((review) => (
              <Card key={review.name} style={{ gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Ionicons key={i} name="star" size={14} color={Colors.warning} />
                  ))}
                </View>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.text, lineHeight: 20 }}>{`"${review.text}"`}</Text>
                <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textTertiary }}>{review.name}</Text>
              </Card>
            ))}
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // Step 20: Record First Dose (milestone moment with confetti)
  if (step === 20) {
    const isInjection = deliveryType === 'injection';
    return (
      <View style={{ flex: 1 }}>
        <OnboardingLayout
          step={20}
          totalSteps={TOTAL_STEPS}
          title="Record Your Starting Dose"
          subtitle="Mark the beginning of your tracking journey"
          onNext={handleLogFirstDose}
          onBack={handleBack}
          nextLabel={showConfetti ? 'Logged!' : 'Log Dose'}
          nextDisabled={showConfetti}
          onSkip={showConfetti ? undefined : handleNext}
          skipLabel="Skip for now"
        >
          <Card elevated style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.accentLight, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous' }}>
                <Ionicons name="flag-outline" size={24} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 }}>
                  Logging your first dose helps us track your medication levels accurately from day one.
                </Text>
              </View>
            </View>
          </Card>

          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>When did you take it?</Text>
          <Card style={{ gap: Spacing.lg, marginBottom: Spacing.xl }}>
            <View style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous' }}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text, flex: 1 }}>Date</Text>
                <DateTimePicker value={firstDoseDateTime} mode="date" display="default" maximumDate={new Date()} onChange={(_, date) => { if (date) { const u = new Date(firstDoseDateTime); u.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); setFirstDoseDateTime(u); } }} />
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: Colors.borderLight }} />
            <View style={{ gap: Spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous' }}>
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text, flex: 1 }}>Time</Text>
                <DateTimePicker value={firstDoseDateTime} mode="time" display="default" onChange={(_, date) => { if (date) { const u = new Date(firstDoseDateTime); u.setHours(date.getHours(), date.getMinutes()); setFirstDoseDateTime(u); } }} />
              </View>
            </View>
          </Card>

          {isInjection && (
            <>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>Where did you inject?</Text>
              <Card style={{ marginBottom: Spacing.xl, paddingVertical: Spacing.lg }}>
                <BodyDiagram selectedSite={firstDoseInjectionSite} onSelectSite={setFirstDoseInjectionSite} />
              </Card>
            </>
          )}

          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>
            Notes<Text style={{ fontFamily: Fonts.regular, color: Colors.textTertiary }}> (optional)</Text>
          </Text>
          <Card>
            <TextInput value={firstDoseNotes} onChangeText={setFirstDoseNotes} placeholder="How did it go? Any observations..." placeholderTextColor={Colors.textTertiary} multiline numberOfLines={3} editable={!showConfetti} style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.text, minHeight: 80, textAlignVertical: 'top', paddingTop: 0 }} />
          </Card>
        </OnboardingLayout>
        {showConfetti && <ConfettiBurst onComplete={handleConfettiComplete} />}
      </View>
    );
  }

  // Step 21: Rate the App
  if (step === 21) {
    return (
      <OnboardingLayout
        step={21}
        totalSteps={TOTAL_STEPS}
        title="Enjoying Slimsy so far?"
        subtitle={"You\u2019re off to a great start! \uD83C\uDF89"}
        onNext={handleNext}
        onBack={handleBack}
        nextLabel="Continue"
        onSkip={handleNext}
        skipLabel="Maybe later"
      >
        <View style={{ alignItems: 'center', gap: Spacing.xxxl, paddingTop: Spacing.xxl }}>
          {/* Illustration icon */}
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              backgroundColor: Colors.warningLight,
              justifyContent: 'center',
              alignItems: 'center',
              borderCurve: 'continuous',
              boxShadow: '0px 4px 16px rgba(240, 160, 48, 0.2)',
            }}
          >
            <Ionicons name="heart" size={40} color={Colors.warning} />
          </View>

          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 16,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
              paddingHorizontal: Spacing.lg,
            }}
          >
            Your feedback helps us build a better experience for everyone on their GLP-1 journey.
          </Text>

          {/* Star rating */}
          <View style={{ gap: Spacing.lg, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => handleStarPress(star)}
                  hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
                  style={{ padding: Spacing.xs }}
                >
                  <Ionicons
                    name={star <= appRating ? 'star' : 'star-outline'}
                    size={44}
                    color={star <= appRating ? Colors.warning : Colors.border}
                  />
                </Pressable>
              ))}
            </View>
            {appRating > 0 && (
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 15,
                  color: appRating >= 4 ? Colors.accent : Colors.textSecondary,
                }}
              >
                {appRating >= 4 ? 'Thank you! We appreciate your support.' : appRating >= 2 ? 'Thanks for your feedback!' : 'We\u2019ll work hard to improve.'}
              </Text>
            )}
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // Step 22: GLP-1 Level Chart (personalised)
  if (step === 22) {
    const medName = medication && medication !== "I don't know" && medication !== 'Other' ? medication : 'your medication';
    const doseLabel = dose && dose !== "I don't know" && dose !== 'Other' ? dose : '';
    const chartW = 300;
    const chartH = 170;
    const padX = 20;
    const padY = 16;

    return (
      <OnboardingLayout
        step={22}
        totalSteps={TOTAL_STEPS}
        title="Your Estimated GLP-1 Levels"
        subtitle={`How ${medName}${doseLabel ? ` (${doseLabel})` : ''} works in your body`}
        onNext={handleNext}
        onBack={handleBack}
      >
        <Card elevated style={{ gap: Spacing.lg }}>
          {/* Chart */}
          <View style={{ alignItems: 'center' }}>
            <Svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
              <Defs>
                <LinearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.25" />
                  <Stop offset="1" stopColor={Colors.primary} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* X-axis baseline */}
              <Line x1={padX} y1={chartH - padY} x2={chartW - padX} y2={chartH - padY} stroke={Colors.borderLight} strokeWidth={1} />

              {/* Area fill under curve */}
              <Path
                d={glpChartData.areaPath}
                fill="url(#curveFill)"
              />

              {/* Main curve */}
              <Path
                d={glpChartData.path}
                stroke={Colors.primary}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Peak dots */}
              {glpChartData.peakPoints.map((pt, i) => (
                <Circle key={`peak-${i}`} cx={pt.x} cy={pt.y} r={4} fill={Colors.primary} />
              ))}

              {/* Trough dots */}
              {glpChartData.troughPoints.map((pt, i) => (
                <Circle key={`trough-${i}`} cx={pt.x} cy={pt.y} r={3.5} fill={Colors.accent} />
              ))}

              {/* Dose labels along bottom */}
              {glpChartData.doseLabels.map((label, i) => {
                const totalLabels = glpChartData.doseLabels.length;
                const usableW = chartW - padX * 2;
                const x = padX + (usableW / Math.max(totalLabels - 1, 1)) * i;
                return (
                  <SvgText
                    key={`label-${i}`}
                    x={x}
                    y={chartH - 2}
                    textAnchor="middle"
                    fontSize={10}
                    fontFamily={Fonts.medium}
                    fill={Colors.textTertiary}
                  >
                    {label}
                  </SvgText>
                );
              })}

              {/* "Peak" / "Trough" annotation on first cycle */}
              {glpChartData.peakPoints.length > 0 && (
                <SvgText
                  x={glpChartData.peakPoints[0].x}
                  y={glpChartData.peakPoints[0].y - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily={Fonts.semiBold}
                  fill={Colors.primary}
                >
                  Peak
                </SvgText>
              )}
              {glpChartData.troughPoints.length > 0 && (
                <SvgText
                  x={glpChartData.troughPoints[0].x}
                  y={glpChartData.troughPoints[0].y - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily={Fonts.semiBold}
                  fill={Colors.accent}
                >
                  Trough
                </SvgText>
              )}
            </Svg>
          </View>

          {/* Educational text */}
          <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text, lineHeight: 22 }}>
            {`After taking ${medName}${doseLabel ? ` ${doseLabel}` : ''} ${getFrequencyLabel()}, levels rise to a peak within 1\u20133 days then gradually decrease. With consistent dosing, your medication builds up for stronger, steadier effects over time.`}
          </Text>

          {/* Legend */}
          <View style={{ gap: Spacing.sm }}>
            {[
              { label: 'Peak Level', desc: 'Strongest appetite suppression', color: Colors.primary },
              { label: 'Trough Level', desc: 'Right before your next dose', color: Colors.accent },
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                <View>
                  <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.text }}>{item.label}</Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Disclaimer */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} style={{ marginTop: 2 }} />
          <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary, flex: 1, lineHeight: 17 }}>
            This is a simplified illustration. Actual levels vary based on individual metabolism, injection site, and other factors.
          </Text>
        </View>
      </OnboardingLayout>
    );
  }

  // Step 23: Hard Paywall
  if (step === 23) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top }}>
        {/* Fixed header — title with inline icon, subtitle */}
        <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xxl }}>
          <Text style={{ fontFamily: Fonts.bold, fontSize: 26, color: Colors.text, textAlign: 'center' }}>
            <Ionicons name="diamond" size={28} color={Colors.primary} />
            {'  Unlock Slimsy Pro'}
          </Text>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Get the full experience with unlimited tracking, AI food analysis, and personalized insights
          </Text>
        </View>

        {/* Scrollable features list — fills available space between header and pinned bottom */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.xxl, gap: Spacing.md, paddingBottom: Spacing.md }}
          showsVerticalScrollIndicator={false}
        >
          {[
            { icon: 'camera-outline', text: 'AI Food Photo Analysis' },
            { icon: 'analytics-outline', text: 'Advanced Weight Charts' },
            { icon: 'notifications-outline', text: 'Smart Dose Reminders' },
            { icon: 'body-outline', text: 'Injection Site Tracker' },
            { icon: 'pulse-outline', text: 'GLP-1 Level Estimator' },
          ].map((f) => (
            <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous' }}>
                <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={20} color={Colors.primary} />
              </View>
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>{f.text}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Pinned bottom — plans, CTA, disclaimers (always visible) */}
        <View style={{ paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm, backgroundColor: Colors.background }}>
          {/* Plan selection */}
          <View style={{ gap: Spacing.md }}>
            <Pressable onPress={() => setSelectedPlan('yearly')}>
              <Card elevated={selectedPlan === 'yearly'} style={{ borderWidth: 2, borderColor: selectedPlan === 'yearly' ? Colors.primary : Colors.border, gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedPlan === 'yearly' ? Colors.primary : Colors.border, justifyContent: 'center', alignItems: 'center' }}>
                    {selectedPlan === 'yearly' && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>Yearly</Text>
                        <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>7-day free trial</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontFamily: Fonts.bold, fontSize: 22, color: selectedPlan === 'yearly' ? Colors.primary : Colors.text }}>$39.99</Text>
                        <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>$3.33/mo</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={{ backgroundColor: Colors.accent, paddingVertical: 4, paddingHorizontal: Spacing.md, borderRadius: Radius.full, alignSelf: 'flex-start', marginLeft: 34, borderCurve: 'continuous' }}>
                  <Text style={{ fontFamily: Fonts.semiBold, fontSize: 11, color: '#fff' }}>BEST VALUE - SAVE 67%</Text>
                </View>
              </Card>
            </Pressable>

            <Pressable onPress={() => setSelectedPlan('monthly')}>
              <Card elevated={selectedPlan === 'monthly'} style={{ borderWidth: 2, borderColor: selectedPlan === 'monthly' ? Colors.primary : Colors.border, gap: Spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedPlan === 'monthly' ? Colors.primary : Colors.border, justifyContent: 'center', alignItems: 'center' }}>
                    {selectedPlan === 'monthly' && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>Monthly</Text>
                        <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>7-day free trial</Text>
                      </View>
                      <Text style={{ fontFamily: Fonts.bold, fontSize: 22, color: selectedPlan === 'monthly' ? Colors.primary : Colors.text }}>$9.99</Text>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          </View>

          {/* CTA */}
          <View style={{ paddingTop: Spacing.lg }}>
            <PrimaryButton title="Start Free Trial" onPress={handleComplete} />
          </View>

          {/* Disclaimers */}
          <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary, textAlign: 'center', paddingTop: Spacing.md, lineHeight: 16 }}>
            {"Cancel anytime. You won't be charged during the free trial."}
          </Text>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary, textAlign: 'center', paddingTop: Spacing.sm, lineHeight: 16 }}>
            Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
          </Text>

          {/* Restore purchases */}
          <Pressable onPress={handleRestorePurchases} disabled={isRestoring} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }} style={{ paddingVertical: Spacing.sm, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm }}>
            {isRestoring ? <ActivityIndicator size="small" color={Colors.textTertiary} /> : <Ionicons name="refresh-outline" size={14} color={Colors.textTertiary} />}
            <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textTertiary }}>{isRestoring ? 'Restoring...' : 'Restore Purchases'}</Text>
          </Pressable>

          {/* Terms & Privacy */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: Spacing.lg }}>
            <Pressable onPress={() => Linking.openURL('https://slimsy.lovable.app/terms')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ paddingVertical: Spacing.xs }}>
              <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: Colors.textTertiary, textDecorationLine: 'underline' }}>Terms of Service</Text>
            </Pressable>
            <Text style={{ fontSize: 12, color: Colors.borderLight }}>|</Text>
            <Pressable onPress={() => Linking.openURL('https://slimsy.lovable.app/privacy')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={{ paddingVertical: Spacing.xs }}>
              <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: Colors.textTertiary, textDecorationLine: 'underline' }}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading...</Text>
    </View>
  );
}
