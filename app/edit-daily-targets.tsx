import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';

interface TargetFieldConfig {
  key: 'calories' | 'protein' | 'fiber' | 'water';
  label: string;
  unit: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  min: number;
  max: number;
  step: number;
  description: string;
}

const targetFields: TargetFieldConfig[] = [
  {
    key: 'calories',
    label: 'Calorie Goal',
    unit: 'kcal',
    icon: 'flame-outline',
    iconColor: '#E5534B',
    iconBg: '#FFF0EF',
    min: 800,
    max: 4000,
    step: 50,
    description: 'Daily calorie intake target',
  },
  {
    key: 'protein',
    label: 'Protein Goal',
    unit: 'g',
    icon: 'fish-outline',
    iconColor: '#1A6FD4',
    iconBg: '#E8F2FF',
    min: 20,
    max: 300,
    step: 5,
    description: 'Supports muscle preservation on GLP-1',
  },
  {
    key: 'fiber',
    label: 'Fiber Goal',
    unit: 'g',
    icon: 'leaf-outline',
    iconColor: '#00B4A6',
    iconBg: '#E0F7F5',
    min: 10,
    max: 60,
    step: 1,
    description: 'Helps with GI health and satiety',
  },
  {
    key: 'water',
    label: 'Water Goal',
    unit: 'glasses',
    icon: 'water-outline',
    iconColor: '#4A90D9',
    iconBg: '#EAF2FD',
    min: 1,
    max: 20,
    step: 1,
    description: 'Stay hydrated, especially on GLP-1',
  },
];

export default function EditDailyTargetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { dailyTargets, setDailyTargets } = useAppStore();

  const [values, setValues] = useState({
    calories: String(dailyTargets.calories),
    protein: String(dailyTargets.protein),
    fiber: String(dailyTargets.fiber),
    water: String(dailyTargets.water),
  });

  const updateValue = (key: string, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val.replace(/[^0-9]/g, '') }));
  };

  const incrementValue = (field: TargetFieldConfig) => {
    const current = parseInt(values[field.key]) || 0;
    const newVal = Math.min(current + field.step, field.max);
    setValues((prev) => ({ ...prev, [field.key]: String(newVal) }));
  };

  const decrementValue = (field: TargetFieldConfig) => {
    const current = parseInt(values[field.key]) || 0;
    const newVal = Math.max(current - field.step, field.min);
    setValues((prev) => ({ ...prev, [field.key]: String(newVal) }));
  };

  const handleSave = () => {
    setDailyTargets({
      calories: Math.max(targetFields[0].min, Math.min(targetFields[0].max, parseInt(values.calories) || dailyTargets.calories)),
      protein: Math.max(targetFields[1].min, Math.min(targetFields[1].max, parseInt(values.protein) || dailyTargets.protein)),
      fiber: Math.max(targetFields[2].min, Math.min(targetFields[2].max, parseInt(values.fiber) || dailyTargets.fiber)),
      water: Math.max(targetFields[3].min, Math.min(targetFields[3].max, parseInt(values.water) || dailyTargets.water)),
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
          Daily Targets
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
          gap: Spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Info Banner */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: Spacing.md,
            backgroundColor: Colors.primaryLight,
            borderRadius: Radius.md,
            gap: Spacing.sm,
            borderCurve: 'continuous',
          }}
        >
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.primary, flex: 1, lineHeight: 18 }}>
            Adjust your daily nutrition targets to match your health plan and GLP-1 journey.
          </Text>
        </View>

        {/* Target Cards */}
        {targetFields.map((field) => (
          <Card key={field.key}>
            <View style={{ gap: Spacing.md }}>
              {/* Header Row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: field.iconBg,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderCurve: 'continuous',
                  }}
                >
                  <Ionicons
                    name={field.icon as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={field.iconColor}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
                    {field.label}
                  </Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}>
                    {field.description}
                  </Text>
                </View>
              </View>

              {/* Stepper Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: Spacing.lg,
                  paddingVertical: Spacing.sm,
                }}
              >
                <Pressable
                  onPress={() => decrementValue(field)}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: pressed ? Colors.borderLight : Colors.surface,
                    borderWidth: 1.5,
                    borderColor: Colors.border,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="remove" size={22} color={Colors.textSecondary} />
                </Pressable>

                <View style={{ flexDirection: 'row', alignItems: 'baseline', minWidth: 120, justifyContent: 'center' }}>
                  <TextInput
                    value={values[field.key]}
                    onChangeText={(t) => updateValue(field.key, t)}
                    keyboardType="number-pad"
                    style={{
                      fontFamily: Fonts.bold,
                      fontSize: 32,
                      color: Colors.text,
                      textAlign: 'center',
                      minWidth: 60,
                      fontVariant: ['tabular-nums'],
                    }}
                    selectTextOnFocus
                  />
                  <Text
                    style={{
                      fontFamily: Fonts.medium,
                      fontSize: 16,
                      color: Colors.textSecondary,
                      marginLeft: Spacing.xs,
                    }}
                  >
                    {field.unit}
                  </Text>
                </View>

                <Pressable
                  onPress={() => incrementValue(field)}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: pressed ? Colors.primaryLight : Colors.surface,
                    borderWidth: 1.5,
                    borderColor: Colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons name="add" size={22} color={Colors.primary} />
                </Pressable>
              </View>

              {/* Range hint */}
              <Text
                style={{
                  fontFamily: Fonts.regular,
                  fontSize: 11,
                  color: Colors.textTertiary,
                  textAlign: 'center',
                }}
              >
                Range: {field.min} – {field.max} {field.unit}
              </Text>
            </View>
          </Card>
        ))}

        <PrimaryButton
          title="Save Targets"
          onPress={handleSave}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
