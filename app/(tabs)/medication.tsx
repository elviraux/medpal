import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BodyDiagram } from '@/components/medication/body-diagram';
import { daysSince, daysUntilNext, getFrequencyDays, formatDate, formatTime } from '@/utils/date';
import type { InjectionSite } from '@/store/types';

const siteLabels: Record<InjectionSite, string> = {
  abdomen_left: 'Abdomen Left',
  abdomen_right: 'Abdomen Right',
  thigh_left: 'Thigh Left',
  thigh_right: 'Thigh Right',
  upper_arm_left: 'Upper Arm Left',
  upper_arm_right: 'Upper Arm Right',
};

const allSites: InjectionSite[] = [
  'abdomen_left', 'abdomen_right', 'thigh_left',
  'thigh_right', 'upper_arm_left', 'upper_arm_right',
];

export default function MedicationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userProfile = useAppStore((s) => s.userProfile);
  const medicationLogs = useAppStore((s) => s.medicationLogs);

  const freqDays = getFrequencyDays(userProfile.frequency ?? 'every_7_days');
  const lastDose = medicationLogs.length > 0 ? medicationLogs[0] : null;
  const daysSinceLastDose = lastDose ? daysSince(lastDose.date) : null;
  const daysUntil = lastDose ? daysUntilNext(lastDose.date, freqDays) : null;

  // Suggest next injection site based on rotation
  const suggestedSite = useMemo(() => {
    if (medicationLogs.length === 0) return 'abdomen_left' as InjectionSite;
    const lastSites = medicationLogs
      .filter((l) => l.injectionSite)
      .map((l) => l.injectionSite!)
      .slice(0, 3);
    const unused = allSites.filter((s) => !lastSites.includes(s));
    return unused.length > 0 ? unused[0] : allSites[0];
  }, [medicationLogs]);

  const isInjection = userProfile.deliveryType === 'injection' || userProfile.deliveryType === 'not_sure';

  // Countdown timer values
  const countDays = daysUntil ?? 0;
  const countHours = daysSinceLastDose != null ? Math.max(0, 24 - (daysSinceLastDose * 24) % 24) : 0;
  const countMins = 0;

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
        Medication
      </Text>

      {/* Next Dose Card */}
      <Card elevated>
        <View style={{ alignItems: 'center', gap: Spacing.md }}>
          <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.textSecondary }}>
            Next Dose: {userProfile.medication ?? 'GLP-1'} {userProfile.dose ?? ''}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.xxl }}>
            <CountdownUnit value={countDays} label="Days" />
            <CountdownUnit value={countHours} label="Hours" />
            <CountdownUnit value={countMins} label="Mins" />
          </View>
          <PrimaryButton
            title="Log Dose"
            onPress={() => router.push('/log-dose')}
            style={{ width: '100%', marginTop: Spacing.sm }}
          />
        </View>
      </Card>

      {/* Injection Site Tracker */}
      {isInjection && (
        <Card>
          <SectionHeader title="Injection Site Tracker" />
          <BodyDiagram
            suggestedSite={suggestedSite}
            onSelectSite={() => router.push('/log-dose')}
          />
        </Card>
      )}

      {/* Dose History */}
      <Card>
        <SectionHeader title="Dose History" />
        {medicationLogs.length === 0 ? (
          <View style={{ paddingVertical: Spacing.xxl, alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="medkit-outline" size={36} color={Colors.textTertiary} />
            <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textTertiary }}>
              No doses logged yet
            </Text>
          </View>
        ) : (
          <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
            {medicationLogs.slice(0, 10).map((log) => (
              <View
                key={log.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.md,
                  paddingVertical: Spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.borderLight,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: Colors.primaryLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderCurve: 'continuous',
                  }}
                >
                  <Ionicons name="medkit" size={18} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.text }}>
                    {formatDate(log.date)}, {formatTime(log.time)}
                  </Text>
                  <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
                    {log.dose}
                    {log.injectionSite ? ` - ${siteLabels[log.injectionSite]}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Current Dose Info */}
      <Card>
        <SectionHeader title="Current Dose" />
        <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
          <InfoRow label="Medication" value={userProfile.medication ?? '--'} icon="flask-outline" />
          <InfoRow label="Dose" value={userProfile.dose ?? '--'} icon="eyedrop-outline" />
          <InfoRow
            label="Frequency"
            value={
              userProfile.frequency === 'every_7_days' ? 'Every 7 days'
              : userProfile.frequency === 'every_14_days' ? 'Every 14 days'
              : userProfile.frequency === 'daily' ? 'Daily'
              : userProfile.frequency ?? '--'
            }
            icon="calendar-outline"
          />
        </View>
      </Card>
    </ScrollView>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: Fonts.bold,
          fontSize: 36,
          color: Colors.text,
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
      <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, flex: 1 }}>
        {label}
      </Text>
      <Text style={{ fontFamily: Fonts.semiBold, fontSize: 14, color: Colors.text }}>
        {value}
      </Text>
    </View>
  );
}
