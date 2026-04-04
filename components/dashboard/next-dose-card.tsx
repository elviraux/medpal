import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { getFrequencyDays } from '@/utils/date';

interface CountdownValues {
  days: number;
  hours: number;
  mins: number;
  overdue: boolean;
}

/** Calculate precise countdown from last dose date+time and frequency */
function computeCountdown(
  lastDoseDate: string,
  lastDoseTime: string,
  frequencyDays: number
): CountdownValues {
  const [year, month, day] = lastDoseDate.split('-').map(Number);
  const [hours, minutes] = lastDoseTime.split(':').map(Number);
  const doseTimestamp = new Date(year, month - 1, day, hours, minutes).getTime();
  const nextDoseTimestamp = doseTimestamp + frequencyDays * 24 * 60 * 60 * 1000;
  const diffMs = nextDoseTimestamp - Date.now();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, mins: 0, overdue: true };
  }

  const totalMins = Math.floor(diffMs / (1000 * 60));
  const d = Math.floor(totalMins / (60 * 24));
  const h = Math.floor((totalMins % (60 * 24)) / 60);
  const m = totalMins % 60;

  return { days: d, hours: h, mins: m, overdue: false };
}

export function NextDoseCard() {
  const router = useRouter();
  const userProfile = useAppStore((s) => s.userProfile);
  const medicationLogs = useAppStore((s) => s.medicationLogs);

  const lastDose = medicationLogs.length > 0 ? medicationLogs[0] : null;
  const freqDays = getFrequencyDays(userProfile.frequency ?? 'every_7_days');

  const getCountdown = useCallback((): CountdownValues => {
    if (!lastDose) return { days: 0, hours: 0, mins: 0, overdue: false };
    return computeCountdown(lastDose.date, lastDose.time, freqDays);
  }, [lastDose, freqDays]);

  const [countdown, setCountdown] = useState(getCountdown);

  // Update countdown every minute
  useEffect(() => {
    setCountdown(getCountdown());
    const interval = setInterval(() => {
      setCountdown(getCountdown());
    }, 60_000);
    return () => clearInterval(interval);
  }, [getCountdown]);

  const medName = userProfile.medication ?? 'GLP-1';
  const dose = userProfile.dose ?? '';
  const hasLoggedDose = lastDose != null;

  return (
    <Card elevated>
      <View style={{ alignItems: 'center', gap: Spacing.md }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Ionicons name="time-outline" size={18} color={Colors.primary} />
          <Text
            style={{
              fontFamily: Fonts.semiBold,
              fontSize: 15,
              color: Colors.text,
            }}
          >
            Next Dose:{' '}
            <Text style={{ color: Colors.primary }}>
              {medName} {dose}
            </Text>
          </Text>
        </View>

        {hasLoggedDose ? (
          <>
            {/* Countdown */}
            {countdown.overdue ? (
              <View style={{ alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.sm,
                    backgroundColor: Colors.warningLight,
                    paddingVertical: Spacing.sm,
                    paddingHorizontal: Spacing.lg,
                    borderRadius: Radius.sm,
                    borderCurve: 'continuous',
                  }}
                >
                  <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                  <Text
                    style={{
                      fontFamily: Fonts.semiBold,
                      fontSize: 14,
                      color: Colors.warning,
                    }}
                  >
                    Dose overdue
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: Spacing.xxl, paddingVertical: Spacing.sm }}>
                <CountdownUnit value={countdown.days} label="Days" />
                <CountdownUnit value={countdown.hours} label="Hours" />
                <CountdownUnit value={countdown.mins} label="Mins" />
              </View>
            )}
          </>
        ) : (
          /* Empty state */
          <Pressable
            onPress={() => router.push('/log-dose')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
              paddingVertical: Spacing.lg,
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color={Colors.textTertiary} />
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 14,
                color: Colors.textSecondary,
              }}
            >
              Log your first dose to start tracking
            </Text>
          </Pressable>
        )}

        {/* Log Dose Button */}
        <PrimaryButton
          title="Log Dose"
          onPress={() => router.push('/log-dose')}
          style={{ width: '100%' }}
        />
      </View>
    </Card>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 56 }}>
      <Text
        style={{
          fontFamily: Fonts.bold,
          fontSize: 36,
          color: Colors.text,
          fontVariant: ['tabular-nums'],
          lineHeight: 42,
        }}
      >
        {String(value).padStart(2, '0')}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.medium,
          fontSize: 12,
          color: Colors.textSecondary,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
