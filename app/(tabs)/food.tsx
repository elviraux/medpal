import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SectionHeader } from '@/components/ui/section-header';
import { getTodayString } from '@/utils/date';
import * as Haptics from 'expo-haptics';

const mealIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'cafe-outline',
};

export default function FoodScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { foodLogs, waterLogs, dailyTargets, setWaterForDate } = useAppStore();

  const today = getTodayString();

  const todayFood = useMemo(
    () => foodLogs.filter((l) => l.date === today),
    [foodLogs, today]
  );
  const totalCalories = todayFood.reduce((s, l) => s + l.calories, 0);
  const totalProtein = todayFood.reduce((s, l) => s + l.protein, 0);
  const totalFiber = todayFood.reduce((s, l) => s + l.fiber, 0);
  const todayWater = waterLogs.find((l) => l.date === today)?.glasses ?? 0;
  const remainingCal = Math.max(0, dailyTargets.calories - totalCalories);

  const addWater = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setWaterForDate(today, Math.min(todayWater + 1, 20));
  };

  const removeWater = () => {
    if (todayWater > 0) {
      setWaterForDate(today, todayWater - 1);
    }
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontFamily: Fonts.bold, fontSize: 26, color: Colors.text }}>
          Food Tracker
        </Text>
        <Pressable
          onPress={() => router.push('/log-food')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: Colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            borderCurve: 'continuous',
          }}
        >
          <Ionicons name="camera-outline" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Daily Summary + Calorie Ring */}
      <Card elevated>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xl }}>
          <View style={{ flex: 1, gap: Spacing.md }}>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
              Daily Summary
            </Text>
            <View style={{ gap: Spacing.sm }}>
              <MacroRow label="Calories" value={`${totalCalories} kcal`} target={`${dailyTargets.calories}`} color={Colors.primary} />
              <MacroRow label="Protein" value={`${totalProtein}g`} target={`${dailyTargets.protein}g`} color="#F97316" />
              <MacroRow label="Fiber" value={`${totalFiber}g`} target={`${dailyTargets.fiber}g`} color={Colors.accent} />
            </View>
          </View>
          <ProgressRing
            progress={totalCalories / dailyTargets.calories}
            size={100}
            strokeWidth={8}
            color={Colors.primary}
            value={`${remainingCal}`}
            sublabel="kcal left"
          />
        </View>
      </Card>

      {/* Water Tracker */}
      <Card>
        <SectionHeader title="Water Tracker" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingTop: Spacing.sm }}>
          <Pressable
            onPress={removeWater}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.borderLight,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="remove" size={20} color={Colors.textSecondary} />
          </Pressable>

          <View style={{ flex: 1, flexDirection: 'row', gap: 4, justifyContent: 'center' }}>
            {Array.from({ length: dailyTargets.water }).map((_, i) => (
              <Pressable
                key={i}
                onPress={() => {
                  if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWaterForDate(today, i + 1);
                }}
              >
                <Ionicons
                  name={i < todayWater ? 'water' : 'water-outline'}
                  size={28}
                  color={i < todayWater ? '#3B82F6' : Colors.borderLight}
                />
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={addWater}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.primaryLight,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="add" size={20} color={Colors.primary} />
          </Pressable>
        </View>
        <Text
          style={{
            fontFamily: Fonts.medium,
            fontSize: 13,
            color: Colors.textSecondary,
            textAlign: 'center',
            marginTop: Spacing.sm,
          }}
        >
          {todayWater} of {dailyTargets.water} glasses
        </Text>
      </Card>

      {/* Today's Log */}
      <Card>
        <SectionHeader title="Today's Log" actionLabel="+ Add" onAction={() => router.push('/log-food')} />
        {todayFood.length === 0 ? (
          <View style={{ paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="restaurant-outline" size={36} color={Colors.textTertiary} />
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textTertiary }}>
              No food logged today
            </Text>
            <Pressable onPress={() => router.push('/log-food')}>
              <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.primary }}>
                Log your first meal
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
            {todayFood.map((item) => (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                  paddingVertical: Spacing.sm,
                }}
              >
                {item.photoUri ? (
                  <Image
                    source={{ uri: item.photoUri }}
                    style={{ width: 48, height: 48, borderRadius: 10 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 10,
                      backgroundColor: Colors.primaryLight,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderCurve: 'continuous',
                    }}
                  >
                    <Ionicons name={mealIcons[item.mealType] ?? 'restaurant-outline'} size={22} color={Colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, textTransform: 'capitalize' }}>
                    {item.mealType}
                  </Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
                    {item.aiDescription || 'Manual entry'}
                  </Text>
                </View>
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.text, fontVariant: ['tabular-nums'] }}>
                  {item.calories} kcal
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Calorie Goal */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
              Calorie Goal
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>
              {totalCalories} / {dailyTargets.calories} kcal
            </Text>
          </View>
          <ProgressRing
            progress={totalCalories / dailyTargets.calories}
            size={60}
            strokeWidth={5}
            color={totalCalories > dailyTargets.calories ? Colors.error : Colors.primary}
            value={`${Math.round((totalCalories / dailyTargets.calories) * 100)}%`}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function MacroRow({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: string;
  target: string;
  color: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.text, flex: 1 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.text, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
        / {target}
      </Text>
    </View>
  );
}
