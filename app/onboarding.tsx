import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
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
import type {
  MedicationType,
  DeliveryType,
  Frequency,
  DeviceType,
  ActivityLevel,
  Motivation,
} from '@/store/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

const TOTAL_STEPS = 21;

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

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUserProfile, completeOnboarding } = useAppStore();

  const [step, setStep] = useState(0);

  // Local state for all onboarding data
  const [medication, setMedication] = useState<MedicationType | undefined>();
  const [deliveryType, setDeliveryType] = useState<DeliveryType | undefined>();
  const [dose, setDose] = useState<string | undefined>();
  const [frequency, setFrequency] = useState<Frequency | undefined>();
  const [deviceType, setDeviceType] = useState<DeviceType | undefined>();
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('ft');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [goalWeight, setGoalWeight] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState(1.0);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>();
  const [cravingsDays, setCravingsDays] = useState<string[]>([]);
  const [sideEffects, setSideEffects] = useState<string[]>([]);
  const [motivation, setMotivation] = useState<Motivation | undefined>();
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');

  // Determine which steps to show based on delivery type
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
    // Skip device step if not injection
    let nextStep = step + 1;
    if (step === 4 && !shouldShowDeviceStep) {
      nextStep = 6; // Skip device type step (step 5)
    }
    setStep(nextStep);
  }, [step, shouldShowDeviceStep]);

  const handleBack = useCallback(() => {
    let prevStep = step - 1;
    if (step === 6 && !shouldShowDeviceStep) {
      prevStep = 4; // Skip back over device type step
    }
    if (prevStep >= 0) setStep(prevStep);
  }, [step, shouldShowDeviceStep]);

  const handleComplete = useCallback(() => {
    const heightVal = heightUnit === 'cm'
      ? parseFloat(heightCm) || undefined
      : ((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0)) * 2.54 || undefined;

    setUserProfile({
      medication,
      deliveryType,
      dose,
      frequency,
      deviceType: shouldShowDeviceStep ? deviceType : undefined,
      height: heightVal,
      heightUnit,
      currentWeight: parseFloat(currentWeight) || undefined,
      startWeight: parseFloat(startWeight) || undefined,
      goalWeight: parseFloat(goalWeight) || undefined,
      startDate: startDate.toISOString().split('T')[0],
      activityLevel,
      motivation,
      initialSideEffects: sideEffects,
      cravingsDays,
      weeklyGoal,
      disclaimerAccepted,
      onboardingComplete: true,
    });
    completeOnboarding();
    router.replace('/(tabs)/dashboard');
  }, [
    medication, deliveryType, dose, frequency, deviceType,
    heightUnit, heightCm, heightFt, heightIn,
    currentWeight, startWeight, goalWeight, startDate,
    activityLevel, motivation, sideEffects, cravingsDays,
    weeklyGoal, disclaimerAccepted, shouldShowDeviceStep,
    setUserProfile, completeOnboarding, router,
  ]);

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

  // Step 6: Estimated Medication Levels (educational)
  if (step === 6) {
    return (
      <OnboardingLayout
        step={6}
        totalSteps={TOTAL_STEPS}
        title="Medication Levels"
        subtitle="Understanding how GLP-1 works in your body"
        onNext={handleNext}
        onBack={handleBack}
      >
        <Card elevated style={{ gap: Spacing.lg }}>
          <View style={{ alignItems: 'center' }}>
            <Svg width={280} height={120} viewBox="0 0 280 120">
              <Path
                d="M10,100 Q40,20 70,40 Q100,60 130,30 Q160,0 190,35 Q220,70 250,25 Q265,10 270,15"
                stroke={Colors.primary}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d="M10,100 Q40,20 70,40 Q100,60 130,30 Q160,0 190,35 Q220,70 250,25 Q265,10 270,15 L270,110 L10,110 Z"
                fill={Colors.primaryLight}
                opacity={0.5}
              />
              {/* Dose markers */}
              <Circle cx={10} cy={100} r={4} fill={Colors.primary} />
              <Circle cx={130} cy={30} r={4} fill={Colors.primary} />
              <Circle cx={270} cy={15} r={4} fill={Colors.primary} />
            </Svg>
          </View>

          <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text, lineHeight: 22 }}>
            After each dose, your GLP-1 medication levels rise to a peak and then gradually decrease. With regular dosing, levels build up over time for better effectiveness.
          </Text>

          <View style={{ gap: Spacing.sm }}>
            {[
              { label: 'Peak Level', desc: 'Strongest appetite suppression', color: Colors.primary },
              { label: 'Trough Level', desc: 'Right before your next dose', color: Colors.accent },
            ].map((item) => (
              <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                <View>
                  <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.text }}>
                    {item.label}
                  </Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </OnboardingLayout>
    );
  }

  // Step 7: Health Disclaimer
  if (step === 7) {
    return (
      <OnboardingLayout
        step={7}
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

  // Step 8: Height
  if (step === 8) {
    return (
      <OnboardingLayout
        step={8}
        totalSteps={TOTAL_STEPS}
        title="What's your height?"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={heightUnit === 'cm' ? !heightCm : (!heightFt)}
      >
        <View style={{ gap: Spacing.xxl, alignItems: 'center', paddingTop: Spacing.xxl }}>
          {/* Unit toggle */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: Colors.borderLight,
              borderRadius: Radius.md,
              padding: 3,
              borderCurve: 'continuous',
            }}
          >
            {(['cm', 'ft'] as const).map((u) => (
              <Pressable
                key={u}
                onPress={() => setHeightUnit(u)}
                style={{
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.xxl,
                  borderRadius: Radius.sm,
                  backgroundColor: heightUnit === u ? Colors.surface : 'transparent',
                  borderCurve: 'continuous',
                  boxShadow: heightUnit === u ? '0px 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Text
                  style={{
                    fontFamily: heightUnit === u ? Fonts.semiBold : Fonts.medium,
                    fontSize: 15,
                    color: heightUnit === u ? Colors.primary : Colors.textSecondary,
                  }}
                >
                  {u}
                </Text>
              </Pressable>
            ))}
          </View>

          {heightUnit === 'cm' ? (
            <NumericInput
              value={heightCm}
              onChangeText={setHeightCm}
              unit="cm"
              large
            />
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
      <OnboardingLayout
        step={9}
        totalSteps={TOTAL_STEPS}
        title="What's your current weight?"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!currentWeight}
      >
        <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
          <NumericInput
            value={currentWeight}
            onChangeText={setCurrentWeight}
            unit={weightUnit}
            units={['lbs', 'kg']}
            selectedUnit={weightUnit}
            onUnitChange={(u) => setWeightUnit(u as 'lbs' | 'kg')}
            large
          />
        </View>
      </OnboardingLayout>
    );
  }

  // Step 10: Starting weight
  if (step === 10) {
    return (
      <OnboardingLayout
        step={10}
        totalSteps={TOTAL_STEPS}
        title="What was your starting weight?"
        subtitle="Your weight when you started GLP-1 medication"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!startWeight}
      >
        <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
          <NumericInput
            value={startWeight}
            onChangeText={setStartWeight}
            unit={weightUnit}
            large
          />
        </View>
      </OnboardingLayout>
    );
  }

  // Step 11: Start date
  if (step === 11) {
    return (
      <OnboardingLayout
        step={11}
        totalSteps={TOTAL_STEPS}
        title="When did you start?"
        subtitle="When did you begin taking your GLP-1 medication?"
        onNext={handleNext}
        onBack={handleBack}
      >
        <View style={{ alignItems: 'center', paddingTop: Spacing.xl }}>
          <DateTimePicker
            value={startDate}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            onChange={(_, date) => {
              if (date) setStartDate(date);
            }}
            style={{ height: 200 }}
          />
        </View>
      </OnboardingLayout>
    );
  }

  // Step 12: Goal weight
  if (step === 12) {
    return (
      <OnboardingLayout
        step={12}
        totalSteps={TOTAL_STEPS}
        title="What's your goal weight?"
        subtitle="Don't worry, you can change this anytime"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!goalWeight}
      >
        <View style={{ alignItems: 'center', paddingTop: Spacing.xxl }}>
          <NumericInput
            value={goalWeight}
            onChangeText={setGoalWeight}
            unit={weightUnit}
            large
          />
        </View>
      </OnboardingLayout>
    );
  }

  // Step 13: Goal pace (slider)
  if (step === 13) {
    return (
      <OnboardingLayout
        step={13}
        totalSteps={TOTAL_STEPS}
        title="Set your pace"
        subtitle="How much weight would you like to lose per week?"
        onNext={handleNext}
        onBack={handleBack}
      >
        <View style={{ alignItems: 'center', paddingTop: Spacing.xxl, gap: Spacing.xxl }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 48,
              color: Colors.primary,
              fontVariant: ['tabular-nums'],
            }}
          >
            {weeklyGoal.toFixed(1)} lbs
          </Text>
          <Text style={{ fontFamily: Fonts.medium, fontSize: 16, color: Colors.textSecondary }}>
            per week
          </Text>
          <View style={{ width: '100%', paddingHorizontal: Spacing.lg }}>
            <Slider
              minimumValue={0.5}
              maximumValue={2.5}
              step={0.5}
              value={weeklyGoal}
              onValueChange={setWeeklyGoal}
              minimumTrackTintColor={Colors.primary}
              maximumTrackTintColor={Colors.borderLight}
              thumbTintColor={Colors.primary}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
                0.5 lbs
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
                2.5 lbs
              </Text>
            </View>
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // Step 14: Activity level
  if (step === 14) {
    return (
      <OnboardingLayout
        step={14}
        totalSteps={TOTAL_STEPS}
        title="Activity level"
        subtitle="How active are you in a typical week?"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!activityLevel}
      >
        <View style={{ gap: Spacing.md }}>
          {activityLevels.map((al) => (
            <Pressable
              key={al.value}
              onPress={() => setActivityLevel(al.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: Spacing.lg,
                borderRadius: Radius.md,
                borderWidth: 1.5,
                borderColor: activityLevel === al.value ? Colors.primary : Colors.border,
                backgroundColor: activityLevel === al.value ? Colors.primaryLight : Colors.surface,
                gap: Spacing.md,
                borderCurve: 'continuous',
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: activityLevel === al.value ? Colors.primary : Colors.borderLight,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderCurve: 'continuous',
                }}
              >
                <Ionicons
                  name={al.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={activityLevel === al.value ? '#fff' : Colors.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
                  {al.label}
                </Text>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
                  {al.desc}
                </Text>
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
      <OnboardingLayout
        step={15}
        totalSteps={TOTAL_STEPS}
        title="Tough days happen"
        subtitle="And that's completely normal"
        onNext={handleNext}
        onBack={handleBack}
      >
        <View style={{ gap: Spacing.xxl, paddingTop: Spacing.lg }}>
          <Card elevated style={{ gap: Spacing.md }}>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                backgroundColor: Colors.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                borderCurve: 'continuous',
              }}
            >
              <Ionicons name="sunny-outline" size={26} color={Colors.primary} />
            </View>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.text }}>
              It gets easier
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, lineHeight: 23 }}>
              Many people experience side effects and tough days in the first few weeks. Your body is adjusting to the medication. Most side effects reduce significantly over time.
            </Text>
          </Card>

          <Card style={{ gap: Spacing.md }}>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text }}>
              Tips for tough days:
            </Text>
            {['Stay hydrated - drink plenty of water', 'Eat small, frequent meals', 'Get enough rest and sleep', 'Track your side effects to share with your doctor'].map((tip, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.accent} style={{ marginTop: 2 }} />
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, flex: 1, lineHeight: 20 }}>
                  {tip}
                </Text>
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
      <OnboardingLayout
        step={16}
        totalSteps={TOTAL_STEPS}
        title="When do cravings hit?"
        subtitle="Select the days you tend to crave food most"
        onNext={handleNext}
        onBack={handleBack}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
          {daysOfWeek.map((day) => (
            <PillButton
              key={day}
              label={day}
              selected={cravingsDays.includes(day)}
              onPress={() => toggleCravingsDay(day)}
              style={{ minWidth: 80 }}
            />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 17: Side effects
  if (step === 17) {
    return (
      <OnboardingLayout
        step={17}
        totalSteps={TOTAL_STEPS}
        title="Any concerns?"
        subtitle="Select side effects you're experiencing or worried about"
        onNext={handleNext}
        onBack={handleBack}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md }}>
          {sideEffectsOptions.map((se) => (
            <PillButton
              key={se}
              label={se}
              selected={sideEffects.includes(se)}
              onPress={() => toggleSideEffect(se)}
            />
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 18: Motivation
  if (step === 18) {
    return (
      <OnboardingLayout
        step={18}
        totalSteps={TOTAL_STEPS}
        title="What motivates you?"
        subtitle="Understanding your 'why' helps us support you better"
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!motivation}
      >
        <View style={{ gap: Spacing.md }}>
          {motivations.map((m) => (
            <Pressable
              key={m.value}
              onPress={() => setMotivation(m.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: Spacing.lg,
                borderRadius: Radius.md,
                borderWidth: 1.5,
                borderColor: motivation === m.value ? Colors.primary : Colors.border,
                backgroundColor: motivation === m.value ? Colors.primaryLight : Colors.surface,
                gap: Spacing.md,
                borderCurve: 'continuous',
              }}
            >
              <Ionicons
                name={m.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={motivation === m.value ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={{
                  fontFamily: motivation === m.value ? Fonts.semiBold : Fonts.medium,
                  fontSize: 16,
                  color: motivation === m.value ? Colors.primary : Colors.text,
                }}
              >
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </OnboardingLayout>
    );
  }

  // Step 19: Social proof
  if (step === 19) {
    return (
      <OnboardingLayout
        step={19}
        totalSteps={TOTAL_STEPS}
        title="You're not alone"
        showProgress={false}
        onNext={handleNext}
        onBack={handleBack}
        nextLabel="Continue"
      >
        <View style={{ gap: Spacing.xxl, alignItems: 'center', paddingTop: Spacing.xl }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 42,
              color: Colors.primary,
              textAlign: 'center',
            }}
          >
            50,000+
          </Text>
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 17,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
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
                <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.text, lineHeight: 20 }}>
                  {`"${review.text}"`}
                </Text>
                <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textTertiary }}>
                  {review.name}
                </Text>
              </Card>
            ))}
          </View>
        </View>
      </OnboardingLayout>
    );
  }

  // Step 20: Paywall
  if (step === 20) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top }}>
        <ScrollView
          contentContainerStyle={{ padding: Spacing.xxl, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: Colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                borderCurve: 'continuous',
                boxShadow: '0px 6px 24px rgba(26, 111, 212, 0.3)',
              }}
            >
              <Ionicons name="diamond-outline" size={36} color="#fff" />
            </View>
            <Text style={{ fontFamily: Fonts.bold, fontSize: 26, color: Colors.text, textAlign: 'center' }}>
              Unlock Slimsy Pro
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
              Get the full experience with unlimited tracking, AI food analysis, and personalized insights
            </Text>
          </View>

          {/* Features */}
          <View style={{ gap: Spacing.md, paddingBottom: Spacing.xxl }}>
            {[
              { icon: 'camera-outline', text: 'AI Food Photo Analysis' },
              { icon: 'analytics-outline', text: 'Advanced Weight Charts' },
              { icon: 'notifications-outline', text: 'Smart Dose Reminders' },
              { icon: 'body-outline', text: 'Injection Site Tracker' },
              { icon: 'pulse-outline', text: 'GLP-1 Level Estimator' },
            ].map((f) => (
              <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: Colors.primaryLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderCurve: 'continuous',
                  }}
                >
                  <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={20} color={Colors.primary} />
                </View>
                <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Plans */}
          <View style={{ gap: Spacing.md }}>
            <Card
              elevated
              style={{
                borderWidth: 2,
                borderColor: Colors.primary,
                gap: Spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>Yearly</Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
                    7-day free trial
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontFamily: Fonts.bold, fontSize: 22, color: Colors.primary }}>$39.99</Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
                    $3.33/mo
                  </Text>
                </View>
              </View>
              <View
                style={{
                  backgroundColor: Colors.accent,
                  paddingVertical: 4,
                  paddingHorizontal: Spacing.md,
                  borderRadius: Radius.full,
                  alignSelf: 'flex-start',
                  borderCurve: 'continuous',
                }}
              >
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 11, color: '#fff' }}>
                  BEST VALUE - SAVE 67%
                </Text>
              </View>
            </Card>

            <Card style={{ gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>Monthly</Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
                    7-day free trial
                  </Text>
                </View>
                <Text style={{ fontFamily: Fonts.bold, fontSize: 22, color: Colors.text }}>$9.99</Text>
              </View>
            </Card>
          </View>

          {/* CTA */}
          <View style={{ paddingTop: Spacing.xxl, gap: Spacing.md }}>
            <PrimaryButton title="Start Free Trial" onPress={handleComplete} />
            <Pressable onPress={handleComplete}>
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 15,
                  color: Colors.textTertiary,
                  textAlign: 'center',
                  paddingVertical: Spacing.md,
                }}
              >
                Maybe later
              </Text>
            </Pressable>
          </View>

          <Text
            style={{
              fontFamily: Fonts.regular,
              fontSize: 11,
              color: Colors.textTertiary,
              textAlign: 'center',
              paddingTop: Spacing.lg,
              lineHeight: 16,
            }}
          >
            {"Cancel anytime. You won't be charged during the free trial."}
          </Text>
        </ScrollView>
      </View>
    );
  }

  // Fallback for out of range - shouldn't happen
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading...</Text>
    </View>
  );
}
