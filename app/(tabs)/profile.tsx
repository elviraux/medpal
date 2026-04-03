import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { formatDate } from '@/utils/date';
import { displayWeight, getWeightUnit, formatHeight, convertWeeklyGoal } from '@/utils/units';
import type { UnitSystem } from '@/utils/units';

function formatFrequency(frequency?: string): string {
  switch (frequency) {
    case 'daily': return 'Daily';
    case 'every_7_days': return 'Weekly';
    case 'every_14_days': return 'Bi-weekly';
    case 'custom': return 'Custom';
    default: return '--';
  }
}

function formatDeliveryType(deliveryType?: string): string {
  switch (deliveryType) {
    case 'injection': return 'Injection';
    case 'pill': return 'Pill';
    default: return '--';
  }
}

function formatActivityLevel(level?: string): string {
  switch (level) {
    case 'sedentary': return 'Sedentary';
    case 'lightly_active': return 'Lightly Active';
    case 'active': return 'Active';
    case 'very_active': return 'Very Active';
    default: return '--';
  }
}

function formatDeviceType(device?: string): string {
  switch (device) {
    case 'single_use_pen': return 'Single-use pen';
    case 'auto_injector': return 'Auto-injector';
    case 'syringe_vial': return 'Syringe & vial';
    case 'other': return 'Other';
    default: return '--';
  }
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    userProfile,
    preferences,
    dailyTargets,
    setPreferences,
    setUserProfile,
    resetStore,
  } = useAppStore();

  const units = (preferences.units ?? 'imperial') as UnitSystem;
  const wUnit = getWeightUnit(units);

  const handleUnitsChange = (newUnits: UnitSystem) => {
    if (newUnits === units) return;
    // Convert weekly goal to new unit system
    if (userProfile.weeklyGoal) {
      const currentGoalUnit = userProfile.weeklyGoalUnit ?? 'lbs';
      const newGoalUnit = newUnits === 'metric' ? 'kg' as const : 'lbs' as const;
      if (currentGoalUnit !== newGoalUnit) {
        const converted = convertWeeklyGoal(userProfile.weeklyGoal, currentGoalUnit, newGoalUnit);
        setUserProfile({ weeklyGoal: converted, weeklyGoalUnit: newGoalUnit });
      }
    }
    setPreferences({ units: newUnits });
  };

  const handleReset = () => {
    Alert.alert(
      'Reset App',
      'This will delete all data and restart onboarding. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetStore();
            router.replace('/onboarding');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.md,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: Spacing.xl,
        gap: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Text style={{ fontFamily: Fonts.bold, fontSize: 26, color: Colors.text }}>
        Profile
      </Text>

      {/* User Info */}
      <Card elevated>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 20,
              backgroundColor: Colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              borderCurve: 'continuous',
            }}
          >
            <Ionicons name="person" size={28} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: Fonts.bold, fontSize: 20, color: Colors.text }}>
              Slimsy User
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary }}>
              {userProfile.medication ?? 'GLP-1'} {userProfile.dose ?? ''} - {formatFrequency(userProfile.frequency)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Medication Details */}
      <Card>
        <SectionHeader
          title="Medication Details"
          actionLabel="Edit"
          onAction={() => router.push('/edit-medication')}
        />
        <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
          <SettingRow
            icon="medical-outline"
            label="Medication"
            value={userProfile.medication ?? '--'}
          />
          <SettingRow
            icon="bandage-outline"
            label="Delivery"
            value={formatDeliveryType(userProfile.deliveryType)}
          />
          <SettingRow
            icon="flask-outline"
            label="Dose"
            value={userProfile.dose ?? '--'}
          />
          <SettingRow
            icon="time-outline"
            label="Frequency"
            value={formatFrequency(userProfile.frequency)}
          />
          {userProfile.deliveryType === 'injection' && (
            <SettingRow
              icon="construct-outline"
              label="Device"
              value={formatDeviceType(userProfile.deviceType)}
            />
          )}
          <SettingRow
            icon="calendar-outline"
            label="Start Date"
            value={userProfile.startDate ? formatDate(userProfile.startDate) : '--'}
          />
        </View>
      </Card>

      {/* Daily Targets */}
      <Card>
        <SectionHeader
          title="Daily Targets"
          actionLabel="Edit"
          onAction={() => router.push('/edit-daily-targets')}
        />
        <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
          <SettingRow
            icon="flame-outline"
            iconColor="#E5534B"
            label="Calories"
            value={`${dailyTargets.calories} kcal`}
          />
          <SettingRow
            icon="fish-outline"
            iconColor="#1A6FD4"
            label="Protein"
            value={`${dailyTargets.protein}g`}
          />
          <SettingRow
            icon="leaf-outline"
            iconColor="#00B4A6"
            label="Fiber"
            value={`${dailyTargets.fiber}g`}
          />
          <SettingRow
            icon="water-outline"
            iconColor="#4A90D9"
            label="Water"
            value={`${dailyTargets.water} glasses`}
          />
        </View>
      </Card>

      {/* Weight Goals */}
      <Card>
        <SectionHeader
          title="Weight Goals"
          actionLabel="Edit"
          onAction={() => router.push('/edit-weight-goals')}
        />
        <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
          <SettingRow
            icon="trending-down-outline"
            label="Start Weight"
            value={userProfile.startWeight ? `${displayWeight(userProfile.startWeight, units).toFixed(1)} ${wUnit}` : '--'}
          />
          <SettingRow
            icon="scale-outline"
            label="Current Weight"
            value={userProfile.currentWeight ? `${displayWeight(userProfile.currentWeight, units).toFixed(1)} ${wUnit}` : '--'}
          />
          <SettingRow
            icon="flag-outline"
            iconColor="#00B4A6"
            label="Goal Weight"
            value={userProfile.goalWeight ? `${displayWeight(userProfile.goalWeight, units).toFixed(1)} ${wUnit}` : '--'}
          />
          <SettingRow
            icon="speedometer-outline"
            label="Weekly Pace"
            value={userProfile.weeklyGoal ? `${userProfile.weeklyGoal} ${userProfile.weeklyGoalUnit ?? 'lbs'}/week` : '--'}
          />
          <SettingRow
            icon="fitness-outline"
            label="Activity Level"
            value={formatActivityLevel(userProfile.activityLevel)}
          />
          {userProfile.height ? (
            <SettingRow
              icon="resize-outline"
              label="Height"
              value={formatHeight(userProfile.height, units)}
            />
          ) : null}
        </View>
      </Card>

      {/* Settings */}
      <Card>
        <SectionHeader title="Settings" />
        <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: Spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name="notifications-outline" size={20} color={Colors.primary} />
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>
                Dose Reminders
              </Text>
            </View>
            <Switch
              value={preferences.doseReminders ?? true}
              onValueChange={(v) => setPreferences({ doseReminders: v })}
              trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
              thumbColor={preferences.doseReminders ? Colors.primary : Colors.textTertiary}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: Spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name="water-outline" size={20} color={Colors.primary} />
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>
                Water Reminders
              </Text>
            </View>
            <Switch
              value={preferences.waterReminders ?? false}
              onValueChange={(v) => setPreferences({ waterReminders: v })}
              trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
              thumbColor={preferences.waterReminders ? Colors.primary : Colors.textTertiary}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: Spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name="swap-horizontal-outline" size={20} color={Colors.primary} />
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>
                Units
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: Colors.borderLight,
                borderRadius: Radius.sm,
                padding: 2,
                borderCurve: 'continuous',
              }}
            >
              {([
                { value: 'imperial' as UnitSystem, label: 'Imperial' },
                { value: 'metric' as UnitSystem, label: 'Metric' },
              ]).map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleUnitsChange(option.value)}
                  style={{
                    paddingVertical: Spacing.xs + 1,
                    paddingHorizontal: Spacing.md,
                    borderRadius: Radius.sm - 2,
                    backgroundColor: units === option.value ? Colors.surface : 'transparent',
                    borderCurve: 'continuous',
                    boxShadow: units === option.value ? '0px 1px 2px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: units === option.value ? Fonts.semiBold : Fonts.medium,
                      fontSize: 13,
                      color: units === option.value ? Colors.primary : Colors.textSecondary,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Card>

      {/* Legal */}
      <Card>
        <SectionHeader title="Legal" />
        <View style={{ gap: Spacing.xs, paddingTop: Spacing.sm }}>
          <Pressable
            onPress={() => Linking.openURL('https://slimsy.lovable.app/terms')}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: Spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primary} />
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>
                Terms of Service
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={Colors.textTertiary} />
          </Pressable>

          <View style={{ height: 1, backgroundColor: Colors.borderLight, marginLeft: 32 }} />

          <Pressable
            onPress={() => Linking.openURL('https://slimsy.lovable.app/privacy')}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingVertical: Spacing.md,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>
                Privacy Policy
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={Colors.textTertiary} />
          </Pressable>
        </View>
      </Card>

      {/* Danger Zone */}
      <Pressable
        onPress={handleReset}
        style={{
          paddingVertical: Spacing.lg,
          alignItems: 'center',
          gap: Spacing.sm,
        }}
      >
        <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.error }}>
          Reset All Data
        </Text>
        <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
          This cannot be undone
        </Text>
      </Pressable>

      <Text
        style={{
          fontFamily: Fonts.regular,
          fontSize: 12,
          color: Colors.textTertiary,
          textAlign: 'center',
          paddingBottom: Spacing.lg,
        }}
      >
        Slimsy v1.0.0
      </Text>
    </ScrollView>
  );
}

function SettingRow({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: string;
  icon?: string;
  iconColor?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs + 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 2 }}>
        {icon && (
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={17}
            color={iconColor ?? Colors.textTertiary}
          />
        )}
        <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary }}>
          {label}
        </Text>
      </View>
      <Text selectable style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text }}>
        {value}
      </Text>
    </View>
  );
}
