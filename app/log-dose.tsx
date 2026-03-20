import React, { useState, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { PillButton } from '@/components/ui/pill-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BodyDiagram } from '@/components/medication/body-diagram';
import { generateId } from '@/utils/date';
import type { InjectionSite } from '@/store/types';

const allSites: InjectionSite[] = [
  'abdomen_left', 'abdomen_right', 'thigh_left',
  'thigh_right', 'upper_arm_left', 'upper_arm_right',
];

export default function LogDoseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userProfile = useAppStore((s) => s.userProfile);
  const medicationLogs = useAppStore((s) => s.medicationLogs);
  const addMedicationLog = useAppStore((s) => s.addMedicationLog);

  const [date, setDate] = useState(new Date());
  const [dose, setDose] = useState(userProfile.dose ?? '');
  const [injectionSite, setInjectionSite] = useState<InjectionSite | undefined>();
  const [notes, setNotes] = useState('');

  const isInjection = userProfile.deliveryType === 'injection' || userProfile.deliveryType === 'not_sure';

  const suggestedSite = useMemo(() => {
    if (medicationLogs.length === 0) return 'abdomen_left' as InjectionSite;
    const lastSites = medicationLogs
      .filter((l) => l.injectionSite)
      .map((l) => l.injectionSite!)
      .slice(0, 3);
    const unused = allSites.filter((s) => !lastSites.includes(s));
    return unused.length > 0 ? unused[0] : allSites[0];
  }, [medicationLogs]);

  const handleSave = () => {
    if (!dose) {
      Alert.alert('Missing dose', 'Please enter your dose amount.');
      return;
    }
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    addMedicationLog({
      id: generateId(),
      date: date.toISOString().split('T')[0],
      time: timeStr,
      dose,
      deliveryType: userProfile.deliveryType ?? 'injection',
      injectionSite: isInjection ? injectionSite : undefined,
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
        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.text }}>Log Dose</Text>
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
        {/* Date & Time */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>
            Date & Time
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <DateTimePicker
              value={date}
              mode="date"
              display="compact"
              maximumDate={new Date()}
              onChange={(_, d) => { if (d) setDate(d); }}
            />
            <DateTimePicker
              value={date}
              mode="time"
              display="compact"
              onChange={(_, d) => { if (d) setDate(d); }}
            />
          </View>
        </Card>

        {/* Dose */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.md }}>
            Dose Amount
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {(userProfile.deliveryType === 'pill'
              ? ['1.5mg', '4mg', '9mg', '25mg']
              : ['0.25mg', '0.5mg', '1mg', '2mg', '2.5mg']
            ).map((d) => (
              <PillButton
                key={d}
                label={d}
                selected={dose === d}
                onPress={() => setDose(d)}
              />
            ))}
          </View>
          <TextInput
            value={dose}
            onChangeText={setDose}
            placeholder="Or enter custom dose..."
            placeholderTextColor={Colors.textTertiary}
            style={{
              fontFamily: Fonts.regular,
              fontSize: 15,
              color: Colors.text,
              paddingVertical: Spacing.md,
              borderTopWidth: 1,
              borderTopColor: Colors.borderLight,
              marginTop: Spacing.md,
            }}
          />
        </Card>

        {/* Injection Site */}
        {isInjection && (
          <Card>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.md }}>
              Injection Site
            </Text>
            <BodyDiagram
              selectedSite={injectionSite}
              suggestedSite={suggestedSite}
              onSelectSite={setInjectionSite}
            />
          </Card>
        )}

        {/* Notes */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about this dose..."
            placeholderTextColor={Colors.textTertiary}
            multiline
            style={{
              fontFamily: Fonts.regular,
              fontSize: 15,
              color: Colors.text,
              minHeight: 60,
              textAlignVertical: 'top',
            }}
          />
        </Card>

        <PrimaryButton title="Save Dose" onPress={handleSave} disabled={!dose} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
