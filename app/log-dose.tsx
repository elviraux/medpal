import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
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
import { PillButton } from '@/components/ui/pill-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BodyDiagram } from '@/components/medication/body-diagram';
import { generateId } from '@/utils/date';
import type { InjectionSite, SideEffectType } from '@/store/types';

const allSites: InjectionSite[] = [
  'abdomen_left', 'abdomen_right', 'thigh_left',
  'thigh_right', 'upper_arm_left', 'upper_arm_right',
];

const symptomOptions: { label: string; value: SideEffectType; icon: string }[] = [
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

export default function LogDoseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userProfile = useAppStore((s) => s.userProfile);
  const medicationLogs = useAppStore((s) => s.medicationLogs);
  const addMedicationLog = useAppStore((s) => s.addMedicationLog);
  const addSideEffectLog = useAppStore((s) => s.addSideEffectLog);

  const [date, setDate] = useState(new Date());
  const [dose, setDose] = useState(userProfile.dose ?? '');
  const [injectionSite, setInjectionSite] = useState<InjectionSite | undefined>();
  const [notes, setNotes] = useState('');

  // Symptom logging state
  const [symptomsExpanded, setSymptomsExpanded] = useState(false);
  const [selectedSymptoms, setSelectedSymptoms] = useState<SideEffectType[]>([]);
  const [symptomSeverities, setSymptomSeverities] = useState<Partial<Record<SideEffectType, number>>>({});
  const [symptomNotes, setSymptomNotes] = useState<Partial<Record<SideEffectType, string>>>({});

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

  const toggleSymptom = (symptom: SideEffectType) => {
    setSelectedSymptoms((prev) => {
      if (prev.includes(symptom)) {
        // Remove symptom and clean up its data
        setSymptomSeverities((s) => {
          const next = { ...s };
          delete next[symptom];
          return next;
        });
        setSymptomNotes((s) => {
          const next = { ...s };
          delete next[symptom];
          return next;
        });
        return prev.filter((s) => s !== symptom);
      }
      // Add symptom with default severity 3
      setSymptomSeverities((s) => ({ ...s, [symptom]: 3 }));
      return [...prev, symptom];
    });
  };

  const toggleSymptomsSection = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSymptomsExpanded((prev) => !prev);
  };

  const handleSave = () => {
    if (!dose) {
      Alert.alert('Missing dose', 'Please enter your dose amount.');
      return;
    }
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    addMedicationLog({
      id: generateId(),
      date: dateStr,
      time: timeStr,
      dose,
      deliveryType: userProfile.deliveryType ?? 'injection',
      injectionSite: isInjection ? injectionSite : undefined,
      notes: notes || undefined,
    });

    // Save each selected symptom as a separate side effect log entry
    for (const symptom of selectedSymptoms) {
      addSideEffectLog({
        id: generateId(),
        date: dateStr,
        effectType: symptom,
        severity: symptomSeverities[symptom] ?? 3,
        notes: symptomNotes[symptom] || undefined,
      });
    }

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

        {/* Symptoms (collapsible) */}
        <Card style={{ overflow: 'hidden' }}>
          <Pressable
            onPress={toggleSymptomsSection}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: selectedSymptoms.length > 0 ? Colors.warningLight : Colors.borderLight,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderCurve: 'continuous',
                }}
              >
                <Ionicons
                  name="bandage-outline"
                  size={17}
                  color={selectedSymptoms.length > 0 ? Colors.warning : Colors.textTertiary}
                />
              </View>
              <View>
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text }}>
                  Log Symptoms
                </Text>
                <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary }}>
                  {selectedSymptoms.length > 0
                    ? `${selectedSymptoms.length} symptom${selectedSymptoms.length > 1 ? 's' : ''} selected`
                    : 'Optional'}
                </Text>
              </View>
            </View>
            <Ionicons
              name={symptomsExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.textTertiary}
            />
          </Pressable>

          {symptomsExpanded && (
            <View style={{ marginTop: Spacing.lg, gap: Spacing.lg }}>
              {/* Symptom chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                {symptomOptions.map((se) => {
                  const isSelected = selectedSymptoms.includes(se.value);
                  return (
                    <Pressable
                      key={se.value}
                      onPress={() => toggleSymptom(se.value)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: Spacing.sm,
                        paddingHorizontal: Spacing.md,
                        borderRadius: Radius.xl,
                        borderWidth: 1.5,
                        borderColor: isSelected ? Colors.primary : Colors.border,
                        backgroundColor: isSelected ? Colors.primaryLight : Colors.surface,
                        gap: Spacing.xs,
                        borderCurve: 'continuous',
                      }}
                    >
                      <Ionicons
                        name={se.icon as keyof typeof Ionicons.glyphMap}
                        size={15}
                        color={isSelected ? Colors.primary : Colors.textSecondary}
                      />
                      <Text
                        style={{
                          fontFamily: isSelected ? Fonts.semiBold : Fonts.medium,
                          fontSize: 13,
                          color: isSelected ? Colors.primary : Colors.text,
                        }}
                      >
                        {se.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Per-symptom severity & notes */}
              {selectedSymptoms.length > 0 && (
                <View style={{ gap: Spacing.md }}>
                  {selectedSymptoms.map((symptom) => {
                    const option = symptomOptions.find((o) => o.value === symptom)!;
                    const severity = symptomSeverities[symptom] ?? 3;
                    const noteText = symptomNotes[symptom] ?? '';

                    return (
                      <View
                        key={symptom}
                        style={{
                          backgroundColor: Colors.borderLight,
                          borderRadius: Radius.md,
                          padding: Spacing.md,
                          gap: Spacing.sm,
                          borderCurve: 'continuous',
                        }}
                      >
                        {/* Symptom name */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                          <Ionicons
                            name={option.icon as keyof typeof Ionicons.glyphMap}
                            size={14}
                            color={Colors.primary}
                          />
                          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 13, color: Colors.text }}>
                            {option.label}
                          </Text>
                        </View>

                        {/* Severity row */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                          <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
                            Severity
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {[1, 2, 3, 4, 5].map((s) => {
                              const isActive = severity === s;
                              const color =
                                s <= 2 ? Colors.accent
                                : s === 3 ? Colors.warning
                                : Colors.error;
                              return (
                                <Pressable
                                  key={s}
                                  onPress={() =>
                                    setSymptomSeverities((prev) => ({ ...prev, [symptom]: s }))
                                  }
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: isActive
                                      ? s <= 2 ? Colors.accentLight
                                      : s === 3 ? Colors.warningLight
                                      : Colors.errorLight
                                      : Colors.surface,
                                    borderWidth: isActive ? 1.5 : 1,
                                    borderColor: isActive ? color : Colors.border,
                                    borderCurve: 'continuous',
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: isActive ? Fonts.bold : Fonts.medium,
                                      fontSize: 14,
                                      color: isActive ? color : Colors.textSecondary,
                                    }}
                                  >
                                    {s}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>

                        {/* Notes input */}
                        <TextInput
                          value={noteText}
                          onChangeText={(text) =>
                            setSymptomNotes((prev) => ({ ...prev, [symptom]: text }))
                          }
                          placeholder="Notes (optional)"
                          placeholderTextColor={Colors.textTertiary}
                          style={{
                            fontFamily: Fonts.regular,
                            fontSize: 13,
                            color: Colors.text,
                            backgroundColor: Colors.surface,
                            borderRadius: Radius.sm,
                            paddingHorizontal: Spacing.md,
                            paddingVertical: Spacing.sm,
                            borderCurve: 'continuous',
                            minHeight: 36,
                          }}
                        />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </Card>

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
