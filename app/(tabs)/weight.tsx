import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { PrimaryButton } from '@/components/ui/primary-button';
import { WeightChart } from '@/components/charts/weight-chart';
import { formatDate } from '@/utils/date';
import { displayWeight, getWeightUnit, calculateBMI } from '@/utils/units';

type TimePeriod = '7d' | '30d' | '90d' | 'all';

export default function WeightScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const userProfile = useAppStore((s) => s.userProfile);
  const weightLogs = useAppStore((s) => s.weightLogs);
  const deleteWeightLog = useAppStore((s) => s.deleteWeightLog);
  const units = useAppStore((s) => s.preferences.units ?? 'imperial');
  const wUnit = getWeightUnit(units);

  const [period, setPeriod] = useState<TimePeriod>('30d');

  // All stored weights are in lbs (canonical)
  const currentWeightLbs = weightLogs.length > 0 ? weightLogs[0].weight : userProfile.currentWeight;
  const startWeightLbs = userProfile.startWeight;
  const goalWeightLbs = userProfile.goalWeight;

  // Display values converted to user's preferred unit
  const currentWeight = currentWeightLbs != null ? displayWeight(currentWeightLbs, units) : undefined;
  const startWeight = startWeightLbs != null ? displayWeight(startWeightLbs, units) : undefined;
  const goalWeight = goalWeightLbs != null ? displayWeight(goalWeightLbs, units) : undefined;

  // Progress calculations use lbs internally
  const totalLostLbs = startWeightLbs && currentWeightLbs ? startWeightLbs - currentWeightLbs : 0;
  const totalLost = Math.abs(displayWeight(totalLostLbs, units));
  const pctToGoal = startWeightLbs && goalWeightLbs && currentWeightLbs
    ? Math.min(100, Math.round(((startWeightLbs - currentWeightLbs) / (startWeightLbs - goalWeightLbs)) * 100))
    : 0;

  // Calculate BMI from lbs and cm
  const heightCm = userProfile.height;
  const bmi = heightCm && currentWeightLbs
    ? calculateBMI(currentWeightLbs, heightCm).toFixed(1)
    : '--';

  // Filter data by period
  const filteredData = useMemo(() => {
    const now = Date.now();
    const cutoffs: Record<TimePeriod, number> = {
      '7d': now - 7 * 86400000,
      '30d': now - 30 * 86400000,
      '90d': now - 90 * 86400000,
      all: 0,
    };
    return weightLogs.filter(
      (l) => new Date(l.date).getTime() >= cutoffs[period]
    );
  }, [weightLogs, period]);

  const chartWidth = width - Spacing.xl * 2 - Spacing.lg * 2;

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
        Weight Tracker
      </Text>

      {/* Current Weight */}
      <Card elevated>
        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary }}>
            Current Weight
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm }}>
            <Text selectable style={{ fontFamily: Fonts.bold, fontSize: 52, color: Colors.text, fontVariant: ['tabular-nums'] }}>
              {currentWeight != null ? currentWeight.toFixed(1) : '--'}
            </Text>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 20, color: Colors.textSecondary }}>
              {wUnit}
            </Text>
          </View>

          {/* Progress bar */}
          {startWeight != null && goalWeight != null && (
            <View style={{ width: '100%', gap: Spacing.sm, paddingTop: Spacing.md }}>
              <View
                style={{
                  height: 8,
                  backgroundColor: Colors.borderLight,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, pctToGoal))}%`,
                    height: '100%',
                    backgroundColor: Colors.accent,
                    borderRadius: 4,
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
                  {startWeight?.toFixed(1)} {wUnit}
                </Text>
                <Text style={{ fontFamily: Fonts.medium, fontSize: 12, color: Colors.accent }}>
                  Goal: {goalWeight?.toFixed(1)} {wUnit}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Card>

      {/* Chart */}
      <Card>
        {/* Period selector */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: Colors.borderLight,
            borderRadius: Radius.sm,
            padding: 3,
            marginBottom: Spacing.md,
            borderCurve: 'continuous',
          }}
        >
          {(['7d', '30d', '90d', 'all'] as TimePeriod[]).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                paddingVertical: Spacing.sm,
                borderRadius: Radius.sm - 2,
                backgroundColor: period === p ? Colors.surface : 'transparent',
                borderCurve: 'continuous',
                boxShadow: period === p ? '0px 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              <Text
                style={{
                  fontFamily: period === p ? Fonts.semiBold : Fonts.medium,
                  fontSize: 13,
                  color: period === p ? Colors.primary : Colors.textSecondary,
                  textAlign: 'center',
                  textTransform: 'capitalize',
                }}
              >
                {p === 'all' ? 'All' : p}
              </Text>
            </Pressable>
          ))}
        </View>

        <WeightChart
          data={filteredData}
          goalWeight={goalWeightLbs}
          width={chartWidth > 0 ? chartWidth : 280}
          height={180}
          units={units}
        />
      </Card>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        <Card style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
            Total Lost
          </Text>
          <Text selectable style={{ fontFamily: Fonts.bold, fontSize: 22, color: Colors.accent, fontVariant: ['tabular-nums'] }}>
            {totalLostLbs > 0 ? totalLost.toFixed(1) : '0'} {wUnit}
          </Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
            % to Goal
          </Text>
          <Text selectable style={{ fontFamily: Fonts.bold, fontSize: 22, color: Colors.primary, fontVariant: ['tabular-nums'] }}>
            {pctToGoal}%
          </Text>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
            BMI
          </Text>
          <Text selectable style={{ fontFamily: Fonts.bold, fontSize: 22, color: Colors.text, fontVariant: ['tabular-nums'] }}>
            {bmi}
          </Text>
        </Card>
      </View>

      {/* Log Weight Button */}
      <PrimaryButton title="Log Weight" onPress={() => router.push('/log-weight')} />

      {/* Weight History */}
      <Card>
        <SectionHeader title="Weight History" />
        {weightLogs.length === 0 ? (
          <View style={{ paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="scale-outline" size={36} color={Colors.textTertiary} />
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textTertiary }}>
              No entries yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: 0, paddingTop: Spacing.sm }}>
            {weightLogs.slice(0, 20).map((log, i) => (
              <View
                key={log.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Spacing.md,
                  borderBottomWidth: i < weightLogs.length - 1 ? 1 : 0,
                  borderBottomColor: Colors.borderLight,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.text }}>
                    {formatDate(log.date)}
                  </Text>
                </View>
                <Text
                  selectable
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 16,
                    color: Colors.text,
                    fontVariant: ['tabular-nums'],
                    marginRight: Spacing.md,
                  }}
                >
                  {displayWeight(log.weight, units).toFixed(1)} {wUnit}
                </Text>
                <Pressable
                  onPress={() => deleteWeightLog(log.id)}
                  hitSlop={10}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
