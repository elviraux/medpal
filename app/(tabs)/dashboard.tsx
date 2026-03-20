import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SectionHeader } from '@/components/ui/section-header';
import { WeightChart } from '@/components/charts/weight-chart';
import {
  getTodayString,
  getGreeting,
  daysSince,
  daysUntilNext,
  getFrequencyDays,
  formatDate,
} from '@/utils/date';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const userProfile = useAppStore((s) => s.userProfile);
  const dailyTargets = useAppStore((s) => s.dailyTargets);
  const foodLogs = useAppStore((s) => s.foodLogs);
  const waterLogs = useAppStore((s) => s.waterLogs);
  const medicationLogs = useAppStore((s) => s.medicationLogs);
  const weightLogs = useAppStore((s) => s.weightLogs);

  const today = getTodayString();

  // Daily food totals
  const todayFood = useMemo(
    () => foodLogs.filter((l) => l.date === today),
    [foodLogs, today]
  );
  const totalCalories = todayFood.reduce((s, l) => s + l.calories, 0);
  const totalProtein = todayFood.reduce((s, l) => s + l.protein, 0);
  const totalFiber = todayFood.reduce((s, l) => s + l.fiber, 0);

  // Water
  const todayWater = waterLogs.find((l) => l.date === today)?.glasses ?? 0;

  // Medication level info
  const lastDose = medicationLogs.length > 0 ? medicationLogs[0] : null;
  const freqDays = getFrequencyDays(userProfile.frequency ?? 'every_7_days');
  const daysSinceLastDose = lastDose ? daysSince(lastDose.date) : null;
  const daysUntil = lastDose ? daysUntilNext(lastDose.date, freqDays) : null;

  // Weight progress
  const currentW = weightLogs.length > 0 ? weightLogs[0].weight : userProfile.currentWeight;
  const recentWeightLogs = weightLogs.slice(0, 30);
  const chartWidth = width - Spacing.xxl * 2 - Spacing.lg * 2;

  // GLP-1 level calculation (simplified)
  const glpLevel = useMemo(() => {
    if (daysSinceLastDose == null) return 0;
    const halfLife = freqDays * 0.7;
    return Math.max(0, Math.min(1, Math.exp(-0.693 * daysSinceLastDose / halfLife)));
  }, [daysSinceLastDose, freqDays]);

  const quickActions = [
    { icon: 'restaurant-outline' as const, label: 'Log Food', route: '/log-food' },
    { icon: 'medkit-outline' as const, label: 'Log Shot', route: '/log-dose' },
    { icon: 'scale-outline' as const, label: 'Log Weight', route: '/log-weight' },
    { icon: 'warning-outline' as const, label: 'Side Effect', route: '/log-side-effect' },
  ];

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
      <View style={{ paddingVertical: Spacing.sm }}>
        <Text style={{ fontFamily: Fonts.bold, fontSize: 26, color: Colors.text }}>
          {getGreeting()}
        </Text>
        <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>

      {/* GLP-1 Level Card */}
      <Card elevated>
        <View style={{ gap: Spacing.md }}>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
            Estimated GLP-1 Level
          </Text>

          <View style={{ height: 80, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={chartWidth > 0 ? chartWidth : 280} height={70} viewBox="0 0 280 70">
              <Path
                d={daysSinceLastDose != null
                  ? `M10,60 Q40,${60 - glpLevel * 50} 70,${60 - glpLevel * 40} Q140,${60 - glpLevel * 30} 200,${60 - glpLevel * 15} Q240,${60 - glpLevel * 8} 270,${60 - glpLevel * 5}`
                  : 'M10,55 L270,55'}
                stroke={Colors.primary}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
              {daysSinceLastDose != null && (
                <SvgCircle cx={10 + (daysSinceLastDose / freqDays) * 260} cy={60 - glpLevel * 50 * Math.max(0, 1 - daysSinceLastDose / freqDays)} r={5} fill={Colors.primary} />
              )}
            </Svg>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: Fonts.bold, fontSize: 20, color: Colors.primary, fontVariant: ['tabular-nums'] }}>
                {daysSinceLastDose ?? '--'}
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
                days since dose
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: Fonts.bold, fontSize: 20, color: Colors.accent, fontVariant: ['tabular-nums'] }}>
                {daysUntil ?? '--'}
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
                next dose in
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontFamily: Fonts.bold, fontSize: 20, color: Colors.text, fontVariant: ['tabular-nums'] }}>
                {Math.round(glpLevel * 100)}%
              </Text>
              <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
                est. level
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Daily Goals Rings */}
      <Card>
        <SectionHeader title="Daily Goals" />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingTop: Spacing.md,
          }}
        >
          <ProgressRing
            progress={totalCalories / dailyTargets.calories}
            color={Colors.primary}
            value={`${totalCalories}`}
            sublabel="kcal"
            label="Calories"
            size={70}
            strokeWidth={5}
          />
          <ProgressRing
            progress={totalProtein / dailyTargets.protein}
            color="#F97316"
            value={`${totalProtein}g`}
            label="Protein"
            size={70}
            strokeWidth={5}
          />
          <ProgressRing
            progress={totalFiber / dailyTargets.fiber}
            color={Colors.accent}
            value={`${totalFiber}g`}
            label="Fiber"
            size={70}
            strokeWidth={5}
          />
          <ProgressRing
            progress={todayWater / dailyTargets.water}
            color="#3B82F6"
            value={`${todayWater}`}
            sublabel="cups"
            label="Water"
            size={70}
            strokeWidth={5}
          />
        </View>
      </Card>

      {/* Weight Progress */}
      <Card>
        <SectionHeader title="Weight Progress" actionLabel="See all" onAction={() => router.push('/(tabs)/weight')} />
        {recentWeightLogs.length > 0 ? (
          <View style={{ paddingTop: Spacing.sm }}>
            <WeightChart
              data={recentWeightLogs}
              goalWeight={userProfile.goalWeight}
              width={chartWidth > 0 ? chartWidth : 280}
              height={140}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: Spacing.md,
              }}
            >
              <View>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
                  Current
                </Text>
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
                  {currentW ?? '--'} lbs
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
                  Goal
                </Text>
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.accent }}>
                  {userProfile.goalWeight ?? '--'} lbs
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="scale-outline" size={32} color={Colors.textTertiary} />
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textTertiary }}>
              No weight logged yet
            </Text>
          </View>
        )}
      </Card>

      {/* Quick Actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: Spacing.md,
        }}
      >
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            onPress={() => router.push(action.route as never)}
            style={({ pressed }) => ({
              flex: 1,
              backgroundColor: Colors.surface,
              borderRadius: Radius.md,
              paddingVertical: Spacing.lg,
              alignItems: 'center',
              gap: Spacing.sm,
              borderCurve: 'continuous',
              boxShadow: Colors.cardShadow,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: Colors.primaryLight,
                justifyContent: 'center',
                alignItems: 'center',
                borderCurve: 'continuous',
              }}
            >
              <Ionicons name={action.icon} size={22} color={Colors.primary} />
            </View>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 11, color: Colors.text, textAlign: 'center' }}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Recent Activity */}
      <Card>
        <SectionHeader title="Recent Activity" />
        {medicationLogs.length === 0 && foodLogs.length === 0 && weightLogs.length === 0 ? (
          <View style={{ paddingVertical: Spacing.xl, alignItems: 'center' }}>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textTertiary }}>
              Start logging to see your activity
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
            {[...medicationLogs.slice(0, 2).map((l) => ({
              type: 'med' as const,
              date: l.date,
              text: `Logged ${l.dose} dose`,
              icon: 'medkit' as const,
              color: Colors.primary,
            })),
            ...foodLogs.slice(0, 2).map((l) => ({
              type: 'food' as const,
              date: l.date,
              text: `${l.mealType}: ${l.calories} kcal`,
              icon: 'restaurant' as const,
              color: '#F97316',
            })),
            ...weightLogs.slice(0, 2).map((l) => ({
              type: 'weight' as const,
              date: l.date,
              text: `Weighed in: ${l.weight} lbs`,
              icon: 'scale' as const,
              color: Colors.accent,
            }))]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5)
              .map((item, i) => (
                <View key={`${item.type}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${item.color}15`,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderCurve: 'continuous',
                    }}
                  >
                    <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.text }}>
                      {item.text}
                    </Text>
                    <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
                      {formatDate(item.date)}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
