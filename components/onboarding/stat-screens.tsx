import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOTAL_STEPS = 28;

// Static image requires — loaded at bundle time so images render instantly
// with zero network delay or decode flash.
const IMG_PROGRESS = require('../../assets/images/Untitleddesign18.png');
const IMG_FITNESS = require('../../assets/images/Untitleddesign18.png');
const IMG_LADDER = require('../../assets/images/Untitleddesign17.png');

// Reusable hero illustration — displays a PNG at a fixed height with
// auto width (aspect ratio preserved via contentFit="contain").
function HeroImage({ source }: { source: number }) {
  return (
    <Image
      source={source}
      style={{ height: 200, width: 260 }}
      contentFit="contain"
      transition={0}
    />
  );
}

interface StatScreenProps {
  step: number;
  onNext: () => void;
  onBack: () => void;
}

// Shared shell with progress header + bottom CTA
function StatShell({
  step,
  onNext,
  onBack,
  children,
}: StatScreenProps & { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top }}>
      {/* Progress bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: Spacing.xl,
          paddingVertical: Spacing.md,
          gap: Spacing.md,
        }}
      >
        <Text
          onPress={onBack}
          style={{
            fontFamily: Fonts.medium,
            fontSize: 16,
            color: Colors.primary,
            paddingRight: Spacing.sm,
          }}
        >
          Back
        </Text>
        <View
          style={{
            flex: 1,
            height: 4,
            backgroundColor: Colors.borderLight,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${(step / TOTAL_STEPS) * 100}%`,
              height: '100%',
              backgroundColor: Colors.primary,
              borderRadius: 2,
            }}
          />
        </View>
        <Text
          style={{
            fontFamily: Fonts.medium,
            fontSize: 13,
            color: Colors.textTertiary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {step}/{TOTAL_STEPS}
        </Text>
      </View>

      {/* Content area */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: Spacing.xxl,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>

      {/* Bottom CTA */}
      <View
        style={{
          paddingHorizontal: Spacing.xxl,
          paddingTop: Spacing.md,
          paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm,
          backgroundColor: Colors.background,
        }}
      >
        <PrimaryButton title="Continue" onPress={onNext} />
      </View>
    </View>
  );
}

// =================================================================
// Screen 1: "3x More Weight Lost" — shown after Medication Selection
// Illustration: progress/climbing bars
// =================================================================
export function StatScreen3x({ step, onNext, onBack }: StatScreenProps) {
  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        <HeroImage source={IMG_PROGRESS} />

        {/* Large stat — "3" massive, "x" accent */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 88,
              color: Colors.primary,
              lineHeight: 96,
              fontVariant: ['tabular-nums'],
            }}
          >
            3
          </Text>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 52,
              color: Colors.primaryDark,
              lineHeight: 60,
            }}
          >
            x
          </Text>
        </View>

        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: 24,
            color: Colors.text,
            textAlign: 'center',
            lineHeight: 32,
          }}
        >
          More Weight Lost
        </Text>

        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 16,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: Spacing.sm,
          }}
        >
          People who track their GLP-1 doses consistently lose 3x more weight
          {"than those who don't."}
        </Text>
      </View>
    </StatShell>
  );
}

// =================================================================
// Screen 2: "87% Say Tracking Changed Everything" — after Goal Weight
// Illustration: person with measuring tape (fitness/body theme)
// =================================================================
export function StatScreen87({ step, onNext, onBack }: StatScreenProps) {
  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        <HeroImage source={IMG_FITNESS} />

        {/* Large stat */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 72,
              color: Colors.accent,
              lineHeight: 80,
              fontVariant: ['tabular-nums'],
            }}
          >
            87
          </Text>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 36,
              color: Colors.accent,
            }}
          >
            %
          </Text>
        </View>

        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: 24,
            color: Colors.text,
            textAlign: 'center',
            lineHeight: 32,
          }}
        >
          Say Tracking Changed Everything
        </Text>

        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 16,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: Spacing.sm,
          }}
        >
          87% of Slimsy users say having a clear goal made their GLP-1 journey
          feel manageable for the first time.
        </Text>
      </View>
    </StatShell>
  );
}

// =================================================================
// Screen 3: "18 lbs Average Lost in 3 Months" — after Goal Pace
// Illustration: two people climbing a ladder together (step-by-step)
// =================================================================
export function StatScreen18lbs({ step, onNext, onBack }: StatScreenProps) {
  const barColor = '#F59E0B';
  const barColorDark = '#D97706';
  const barColorDeep = '#92400E';

  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        <HeroImage source={IMG_LADDER} />

        {/* Large stat with unit */}
        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 72,
                color: barColorDark,
                lineHeight: 80,
                fontVariant: ['tabular-nums'],
              }}
            >
              18
            </Text>
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 28,
                color: barColor,
              }}
            >
              lbs
            </Text>
          </View>
          {/* "in 3 months" pill badge */}
          <View
            style={{
              backgroundColor: '#FEF3C7',
              paddingHorizontal: Spacing.lg,
              paddingVertical: 6,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.xs,
            }}
          >
            <Ionicons name="trending-down" size={14} color={barColorDeep} />
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 13,
                color: barColorDeep,
              }}
            >
              in just 3 months
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: 24,
            color: Colors.text,
            textAlign: 'center',
            lineHeight: 32,
          }}
        >
          Average Lost in 3 Months
        </Text>

        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 16,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: Spacing.sm,
          }}
        >
          Slimsy users who set a weekly pace goal lose an average of 18 lbs in
          their first 3 months.
        </Text>
      </View>
    </StatShell>
  );
}

// =================================================================
// Screen 4: "68% Fewer Surprise Side Effects" — after Side Effects
// Illustration: person with measuring tape (wellness/body theme)
// =================================================================
export function StatScreen68({ step, onNext, onBack }: StatScreenProps) {
  const purple = '#7C3AED';
  const purpleBg = '#F3EEFF';

  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        <HeroImage source={IMG_FITNESS} />

        {/* Large stat */}
        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: 72,
            color: purple,
            lineHeight: 80,
            fontVariant: ['tabular-nums'],
          }}
        >
          68%
        </Text>

        {/* Insight pills */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <View
            style={{
              backgroundColor: purpleBg,
              paddingHorizontal: Spacing.md,
              paddingVertical: 5,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.xs,
            }}
          >
            <Ionicons name="eye-outline" size={13} color={purple} />
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 12,
                color: purple,
              }}
            >
              Spot patterns
            </Text>
          </View>
          <View
            style={{
              backgroundColor: purpleBg,
              paddingHorizontal: Spacing.md,
              paddingVertical: 5,
              borderRadius: 999,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.xs,
            }}
          >
            <Ionicons name="pulse-outline" size={13} color={purple} />
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 12,
                color: purple,
              }}
            >
              Adjust sooner
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: 24,
            color: Colors.text,
            textAlign: 'center',
            lineHeight: 32,
          }}
        >
          Fewer Surprise Side Effects
        </Text>

        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 16,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: Spacing.sm,
          }}
        >
          Users who log side effects early spot patterns 68% faster — and work
          with their doctor to adjust sooner.
        </Text>
      </View>
    </StatShell>
  );
}

// =================================================================
// Screen 5: "5 min A Day Is All It Takes" — after Activity Level
// Illustration: progress/achievement theme
// =================================================================
export function StatScreen5min({ step, onNext, onBack }: StatScreenProps) {
  const green = '#16A34A';
  const greenLight = '#22C55E';
  const greenBg = '#F0FDF4';
  const greenDeep = '#166534';

  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        <HeroImage source={IMG_PROGRESS} />

        {/* Large stat */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 72,
              color: green,
              lineHeight: 80,
              fontVariant: ['tabular-nums'],
            }}
          >
            5
          </Text>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 32,
              color: greenLight,
            }}
          >
            min
          </Text>
        </View>

        {/* Quick check-in badge */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xs,
            backgroundColor: greenBg,
            paddingHorizontal: Spacing.lg,
            paddingVertical: 6,
            borderRadius: 999,
          }}
        >
          <Ionicons name="timer-outline" size={15} color={green} />
          <Text
            style={{
              fontFamily: Fonts.semiBold,
              fontSize: 13,
              color: greenDeep,
            }}
          >
            Quick daily check-in
          </Text>
        </View>

        <Text
          style={{
            fontFamily: Fonts.bold,
            fontSize: 24,
            color: Colors.text,
            textAlign: 'center',
            lineHeight: 32,
          }}
        >
          A Day Is All It Takes
        </Text>

        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 16,
            color: Colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: Spacing.sm,
          }}
        >
          Just 5 minutes of daily tracking with Slimsy is enough to stay on
          track and hit your goals.
        </Text>
      </View>
    </StatShell>
  );
}
