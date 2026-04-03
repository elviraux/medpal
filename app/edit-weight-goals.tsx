import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { displayWeight, toLbs, getWeightUnit } from '@/utils/units';
import type { UnitSystem } from '@/utils/units';
import type { ActivityLevel } from '@/store/types';

const activityLevels: { label: string; value: ActivityLevel; desc: string; icon: string }[] = [
  { label: 'Sedentary', value: 'sedentary', desc: 'Little or no exercise', icon: 'bed-outline' },
  { label: 'Lightly Active', value: 'lightly_active', desc: 'Light exercise 1-3 days/week', icon: 'walk-outline' },
  { label: 'Active', value: 'active', desc: 'Moderate exercise 3-5 days/week', icon: 'bicycle-outline' },
  { label: 'Very Active', value: 'very_active', desc: 'Hard exercise 6-7 days/week', icon: 'barbell-outline' },
];

export default function EditWeightGoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile, preferences, setUserProfile } = useAppStore();

  const units = (preferences.units ?? 'imperial') as UnitSystem;
  const wUnit = getWeightUnit(units);
  const isMetric = units === 'metric';

  // Initialize goal weight in display units
  const [goalWeight, setGoalWeight] = useState(
    userProfile.goalWeight
      ? displayWeight(userProfile.goalWeight, units).toFixed(1)
      : ''
  );

  // Weekly pace
  const weeklyGoalUnit = isMetric ? 'kg' as const : 'lbs' as const;
  const currentWeeklyGoal = userProfile.weeklyGoal ?? (isMetric ? 0.5 : 1.0);
  const [weeklyGoal, setWeeklyGoal] = useState(currentWeeklyGoal);

  // Activity level
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | undefined>(
    userProfile.activityLevel
  );

  const sliderMin = isMetric ? 0.25 : 0.5;
  const sliderMax = isMetric ? 1.0 : 2.5;
  const sliderStep = isMetric ? 0.25 : 0.5;
  const displayPace = isMetric ? weeklyGoal.toFixed(2) : weeklyGoal.toFixed(1);

  // Pace description based on slider position
  const getPaceLabel = (): { label: string; color: string } => {
    const ratio = (weeklyGoal - sliderMin) / (sliderMax - sliderMin);
    if (ratio <= 0.33) return { label: 'Steady & sustainable', color: Colors.accent };
    if (ratio <= 0.66) return { label: 'Moderate pace', color: Colors.primary };
    return { label: 'Aggressive pace', color: Colors.warning };
  };

  const paceInfo = getPaceLabel();

  const handleSave = () => {
    const gw = parseFloat(goalWeight);
    if (goalWeight && (!gw || gw <= 0)) {
      Alert.alert('Invalid weight', 'Please enter a valid goal weight.');
      return;
    }

    setUserProfile({
      goalWeight: gw ? toLbs(gw, units) : undefined,
      weeklyGoal,
      weeklyGoalUnit,
      activityLevel,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: insets.top + Spacing.md,
          paddingHorizontal: Spacing.xl,
          paddingBottom: Spacing.md,
          backgroundColor: Colors.background,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ minWidth: 60 }}>
          <Text style={{ fontFamily: Fonts.medium, fontSize: 16, color: Colors.primary }}>
            Cancel
          </Text>
        </Pressable>
        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.text }}>
          Weight Goals
        </Text>
        <Pressable onPress={handleSave} hitSlop={10} style={{ minWidth: 60, alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.primary }}>
            Save
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.xl,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Goal Weight */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: Colors.accentLight,
                justifyContent: 'center',
                alignItems: 'center',
                borderCurve: 'continuous',
              }}
            >
              <Ionicons name="flag-outline" size={22} color={Colors.accent} />
            </View>
            <View>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
                Goal Weight
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>
                Your target weight to reach
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm }}>
              <TextInput
                value={goalWeight}
                onChangeText={(t) => setGoalWeight(t.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                selectTextOnFocus
                style={{
                  fontFamily: Fonts.bold,
                  fontSize: 48,
                  color: Colors.text,
                  textAlign: 'center',
                  minWidth: 100,
                }}
              />
              <Text style={{ fontFamily: Fonts.medium, fontSize: 20, color: Colors.textSecondary }}>
                {wUnit}
              </Text>
            </View>

            {/* Current weight context */}
            {userProfile.currentWeight && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.xs,
                  marginTop: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  paddingVertical: Spacing.sm,
                  backgroundColor: Colors.borderLight,
                  borderRadius: Radius.full,
                  borderCurve: 'continuous',
                }}
              >
                <Ionicons name="analytics-outline" size={14} color={Colors.textSecondary} />
                <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
                  Current: {displayWeight(userProfile.currentWeight, units).toFixed(1)} {wUnit}
                </Text>
                {goalWeight && parseFloat(goalWeight) > 0 && (
                  <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.accent }}>
                    {'  '}({(displayWeight(userProfile.currentWeight, units) - parseFloat(goalWeight)).toFixed(1)} {wUnit} to go)
                  </Text>
                )}
              </View>
            )}
          </View>
        </Card>

        {/* Weekly Pace */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: Colors.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                borderCurve: 'continuous',
              }}
            >
              <Ionicons name="speedometer-outline" size={22} color={Colors.primary} />
            </View>
            <View>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
                Weekly Pace
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>
                Target weight loss per week
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', gap: Spacing.lg }}>
            {/* Display Value */}
            <View style={{ alignItems: 'center', gap: Spacing.xs }}>
              <Text
                style={{
                  fontFamily: Fonts.bold,
                  fontSize: 42,
                  color: Colors.primary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {displayPace} {weeklyGoalUnit}
              </Text>
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.textSecondary }}>
                per week
              </Text>
            </View>

            {/* Pace Label Chip */}
            <View
              style={{
                paddingHorizontal: Spacing.lg,
                paddingVertical: Spacing.sm,
                borderRadius: Radius.full,
                backgroundColor: paceInfo.color + '15',
                borderCurve: 'continuous',
              }}
            >
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 13, color: paceInfo.color }}>
                {paceInfo.label}
              </Text>
            </View>

            {/* Slider */}
            <View style={{ width: '100%', paddingHorizontal: Spacing.sm }}>
              <Slider
                minimumValue={sliderMin}
                maximumValue={sliderMax}
                step={sliderStep}
                value={weeklyGoal}
                onValueChange={setWeeklyGoal}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.borderLight}
                thumbTintColor={Colors.primary}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
                  {isMetric ? '0.25 kg' : '0.5 lbs'}
                </Text>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
                  {isMetric ? '1.0 kg' : '2.5 lbs'}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Activity Level */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                backgroundColor: Colors.warningLight,
                justifyContent: 'center',
                alignItems: 'center',
                borderCurve: 'continuous',
              }}
            >
              <Ionicons name="fitness-outline" size={22} color={Colors.warning} />
            </View>
            <View>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
                Activity Level
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>
                Helps estimate your calorie needs
              </Text>
            </View>
          </View>

          <View style={{ gap: Spacing.sm }}>
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
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: activityLevel === al.value ? Colors.primary : Colors.borderLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderCurve: 'continuous',
                  }}
                >
                  <Ionicons
                    name={al.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={activityLevel === al.value ? '#fff' : Colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontFamily: activityLevel === al.value ? Fonts.semiBold : Fonts.medium,
                      fontSize: 15,
                      color: activityLevel === al.value ? Colors.primary : Colors.text,
                    }}
                  >
                    {al.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: Fonts.regular,
                      fontSize: 12,
                      color: Colors.textSecondary,
                      marginTop: 1,
                    }}
                  >
                    {al.desc}
                  </Text>
                </View>
                {activityLevel === al.value && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </Card>

        <PrimaryButton
          title="Save Goals"
          onPress={handleSave}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
