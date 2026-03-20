import React from 'react';
import { View, Text, ScrollView, Pressable, Alert, Switch } from 'react-native';
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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    userProfile,
    preferences,
    dailyTargets,
    setPreferences,
    resetStore,
  } = useAppStore();

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
              {userProfile.medication ?? 'GLP-1'} {userProfile.dose ?? ''} - {
                userProfile.frequency === 'daily' ? 'Daily'
                : userProfile.frequency === 'every_7_days' ? 'Weekly'
                : userProfile.frequency === 'every_14_days' ? 'Bi-weekly'
                : 'Custom'
              }
            </Text>
          </View>
        </View>
      </Card>

      {/* Medication Details */}
      <Card>
        <SectionHeader title="Medication Details" />
        <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
          <SettingRow label="Medication" value={userProfile.medication ?? '--'} />
          <SettingRow label="Delivery" value={
            userProfile.deliveryType === 'injection' ? 'Injection'
            : userProfile.deliveryType === 'pill' ? 'Pill'
            : '--'
          } />
          <SettingRow label="Dose" value={userProfile.dose ?? '--'} />
          <SettingRow
            label="Start Date"
            value={userProfile.startDate ? formatDate(userProfile.startDate) : '--'}
          />
          <SettingRow label="Activity Level" value={
            userProfile.activityLevel === 'sedentary' ? 'Sedentary'
            : userProfile.activityLevel === 'lightly_active' ? 'Lightly Active'
            : userProfile.activityLevel === 'active' ? 'Active'
            : userProfile.activityLevel === 'very_active' ? 'Very Active'
            : '--'
          } />
        </View>
      </Card>

      {/* Daily Targets */}
      <Card>
        <SectionHeader title="Daily Targets" />
        <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
          <SettingRow label="Calories" value={`${dailyTargets.calories} kcal`} />
          <SettingRow label="Protein" value={`${dailyTargets.protein}g`} />
          <SettingRow label="Fiber" value={`${dailyTargets.fiber}g`} />
          <SettingRow label="Water" value={`${dailyTargets.water} glasses`} />
        </View>
      </Card>

      {/* Weight Info */}
      <Card>
        <SectionHeader title="Weight Goals" />
        <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
          <SettingRow label="Start Weight" value={userProfile.startWeight ? `${userProfile.startWeight} lbs` : '--'} />
          <SettingRow label="Current Weight" value={userProfile.currentWeight ? `${userProfile.currentWeight} lbs` : '--'} />
          <SettingRow label="Goal Weight" value={userProfile.goalWeight ? `${userProfile.goalWeight} lbs` : '--'} />
          <SettingRow label="Weekly Goal" value={userProfile.weeklyGoal ? `${userProfile.weeklyGoal} lbs/week` : '--'} />
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
            <Pressable
              onPress={() =>
                setPreferences({
                  units: preferences.units === 'metric' ? 'imperial' : 'metric',
                })
              }
              style={{
                paddingVertical: Spacing.xs,
                paddingHorizontal: Spacing.md,
                backgroundColor: Colors.primaryLight,
                borderRadius: Radius.sm,
                borderCurve: 'continuous',
              }}
            >
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.primary }}>
                {preferences.units === 'metric' ? 'Metric' : 'Imperial'}
              </Text>
            </Pressable>
          </View>
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

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
      }}
    >
      <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary }}>
        {label}
      </Text>
      <Text selectable style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text }}>
        {value}
      </Text>
    </View>
  );
}
