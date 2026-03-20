import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { generateId } from '@/utils/date';
import type { SideEffectType } from '@/store/types';

const sideEffects: { label: string; value: SideEffectType; icon: string }[] = [
  { label: 'Nausea', value: 'nausea', icon: 'sad-outline' },
  { label: 'Heartburn', value: 'heartburn', icon: 'flame-outline' },
  { label: 'Fatigue', value: 'fatigue', icon: 'battery-half-outline' },
  { label: 'Hair Loss', value: 'hair_loss', icon: 'cut-outline' },
  { label: 'Constipation', value: 'constipation', icon: 'alert-circle-outline' },
  { label: 'Muscle Loss', value: 'muscle_loss', icon: 'fitness-outline' },
  { label: 'Injection Anxiety', value: 'injection_anxiety', icon: 'pulse-outline' },
  { label: 'Loose Skin', value: 'loose_skin', icon: 'body-outline' },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal-outline' },
];

export default function LogSideEffectScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addSideEffectLog = useAppStore((s) => s.addSideEffectLog);

  const [effectType, setEffectType] = useState<SideEffectType | undefined>();
  const [severity, setSeverity] = useState(3);
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!effectType) {
      Alert.alert('Select effect', 'Please select a side effect.');
      return;
    }
    addSideEffectLog({
      id: generateId(),
      date: date.toISOString().split('T')[0],
      effectType,
      severity,
      notes: notes || undefined,
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
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ fontFamily: Fonts.medium, fontSize: 16, color: Colors.primary }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.text }}>Log Side Effect</Text>
        <Pressable onPress={handleSave} hitSlop={10}>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.primary }}>Save</Text>
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
        {/* Effect type */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.md }}>
            What are you experiencing?
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {sideEffects.map((se) => (
              <Pressable
                key={se.value}
                onPress={() => setEffectType(se.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.md,
                  borderRadius: Radius.xl,
                  borderWidth: 1.5,
                  borderColor: effectType === se.value ? Colors.primary : Colors.border,
                  backgroundColor: effectType === se.value ? Colors.primaryLight : Colors.surface,
                  gap: Spacing.xs,
                  borderCurve: 'continuous',
                }}
              >
                <Ionicons
                  name={se.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={effectType === se.value ? Colors.primary : Colors.textSecondary}
                />
                <Text
                  style={{
                    fontFamily: effectType === se.value ? Fonts.semiBold : Fonts.medium,
                    fontSize: 13,
                    color: effectType === se.value ? Colors.primary : Colors.text,
                  }}
                >
                  {se.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Severity */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.md }}>
            Severity
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable
                key={s}
                onPress={() => setSeverity(s)}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor:
                    severity === s
                      ? s <= 2 ? Colors.accentLight
                      : s === 3 ? Colors.warningLight
                      : Colors.errorLight
                      : Colors.borderLight,
                  borderWidth: severity === s ? 2 : 0,
                  borderColor:
                    s <= 2 ? Colors.accent
                    : s === 3 ? Colors.warning
                    : Colors.error,
                  borderCurve: 'continuous',
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.bold,
                    fontSize: 18,
                    color:
                      severity === s
                        ? s <= 2 ? Colors.accent
                        : s === 3 ? Colors.warning
                        : Colors.error
                        : Colors.textSecondary,
                  }}
                >
                  {s}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm }}>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>Mild</Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>Severe</Text>
          </View>
        </Card>

        {/* Date */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>
            Date
          </Text>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            maximumDate={new Date()}
            onChange={(_, d) => { if (d) setDate(d); }}
          />
        </Card>

        {/* Notes */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe what you're feeling..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            style={{
              fontFamily: Fonts.regular,
              fontSize: 15,
              color: Colors.text,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </Card>

        <PrimaryButton title="Save Side Effect" onPress={handleSave} disabled={!effectType} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
