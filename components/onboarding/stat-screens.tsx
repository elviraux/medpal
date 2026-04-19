import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

const TOTAL_STEPS = 28;

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
// Screen 1: "3x More Weight Lost"
// Visual: Concentric orbital rings with medical icon + floating dots
// Color: Primary blue
// =================================================================
export function StatScreen3x({ step, onNext, onBack }: StatScreenProps) {
  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        {/* Atmospheric glow */}
        <View
          style={{
            position: 'absolute',
            top: -60,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: 'rgba(26, 111, 212, 0.04)',
          }}
        />

        {/* Orbital rings with icon */}
        <View
          style={{
            width: 200,
            height: 200,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg
            width={200}
            height={200}
            viewBox="0 0 200 200"
            style={{ position: 'absolute' }}
          >
            {/* Outer dashed ring */}
            <Circle
              cx={100}
              cy={100}
              r={95}
              stroke={`${Colors.primary}`}
              strokeOpacity={0.08}
              strokeWidth={1.5}
              strokeDasharray="6 6"
              fill="none"
            />
            {/* Middle ring */}
            <Circle
              cx={100}
              cy={100}
              r={72}
              stroke={`${Colors.primary}`}
              strokeOpacity={0.12}
              strokeWidth={1.5}
              fill="none"
            />
            {/* Orbiting dots */}
            <Circle cx={180} cy={60} r={5} fill={Colors.primary} opacity={0.15} />
            <Circle cx={25} cy={140} r={4} fill={Colors.primary} opacity={0.1} />
            <Circle cx={160} cy={170} r={3} fill={Colors.primary} opacity={0.2} />
          </Svg>

          {/* Center icon */}
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 28,
              borderCurve: 'continuous',
              backgroundColor: Colors.primaryLight,
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: `0px 12px 40px rgba(26, 111, 212, 0.15)`,
            }}
          >
            <Ionicons name="medical-outline" size={42} color={Colors.primary} />
          </View>
        </View>

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
// Screen 2: "87% Say Tracking Changed Everything"
// Visual: SVG donut/arc chart with stat centered inside
// Color: Teal / Accent
// =================================================================
export function StatScreen87({ step, onNext, onBack }: StatScreenProps) {
  const radius = 76;
  const strokeWidth = 12;
  const center = 95;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.87;
  const dashOffset = circumference * (1 - progress);

  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        {/* Atmospheric glow */}
        <View
          style={{
            position: 'absolute',
            top: -40,
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: 'rgba(0, 180, 166, 0.04)',
          }}
        />

        {/* Donut chart */}
        <View
          style={{
            width: 190,
            height: 190,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={190} height={190} viewBox="0 0 190 190">
            <Defs>
              <LinearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={Colors.accent} />
                <Stop offset="100%" stopColor="#00D4C4" />
              </LinearGradient>
            </Defs>
            {/* Track */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={Colors.accent}
              strokeOpacity={0.1}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress arc */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke="url(#donutGrad)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${center} ${center})`}
            />
            {/* End cap dot */}
            <Circle
              cx={center}
              cy={center - radius}
              r={strokeWidth / 2}
              fill={Colors.accent}
            />
          </Svg>

          {/* Centered stat */}
          <View style={{ position: 'absolute', alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 52,
                color: Colors.accent,
                lineHeight: 60,
                fontVariant: ['tabular-nums'],
              }}
            >
              87
            </Text>
            <Text
              style={{
                fontFamily: Fonts.semiBold,
                fontSize: 20,
                color: Colors.accent,
                marginTop: -4,
              }}
            >
              percent
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
// Screen 3: "18 lbs Average Lost in 3 Months"
// Visual: Ascending bar chart for 3 months + "in 3 months" pill badge
// Color: Warm amber / gold
// =================================================================
export function StatScreen18lbs({ step, onNext, onBack }: StatScreenProps) {
  const barColor = '#F59E0B';
  const barColorDark = '#D97706';
  const barColorDeep = '#92400E';

  const months = [
    { label: 'Month 1', value: 6, height: 48 },
    { label: 'Month 2', value: 12, height: 80 },
    { label: 'Month 3', value: 18, height: 112 },
  ];

  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        {/* Atmospheric glow */}
        <View
          style={{
            position: 'absolute',
            top: -40,
            width: 300,
            height: 300,
            borderRadius: 150,
            backgroundColor: 'rgba(245, 158, 11, 0.04)',
          }}
        />

        {/* Bar chart */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: Spacing.lg,
            height: 150,
            paddingTop: Spacing.lg,
          }}
        >
          {months.map((m, i) => {
            const isLast = i === months.length - 1;
            return (
              <View key={i} style={{ alignItems: 'center', gap: Spacing.sm }}>
                <Text
                  style={{
                    fontFamily: Fonts.semiBold,
                    fontSize: 13,
                    color: barColorDark,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  -{m.value}
                </Text>
                <View
                  style={{
                    width: 52,
                    height: m.height,
                    borderRadius: 14,
                    borderCurve: 'continuous',
                    backgroundColor: isLast
                      ? barColor
                      : i === 0
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(245, 158, 11, 0.45)',
                    boxShadow: isLast
                      ? '0px 6px 20px rgba(245, 158, 11, 0.3)'
                      : 'none',
                  }}
                />
                <Text
                  style={{
                    fontFamily: Fonts.medium,
                    fontSize: 12,
                    color: Colors.textTertiary,
                  }}
                >
                  {m.label}
                </Text>
              </View>
            );
          })}
        </View>

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
// Screen 4: "68% Fewer Surprise Side Effects"
// Visual: Gradient shield silhouette with stat + checkmark overlaid
// Color: Purple / Violet
// =================================================================
export function StatScreen68({ step, onNext, onBack }: StatScreenProps) {
  const purple = '#7C3AED';
  const purpleLight = '#A78BFA';
  const purpleBg = '#F3EEFF';

  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        {/* Atmospheric glow */}
        <View
          style={{
            position: 'absolute',
            top: -40,
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: 'rgba(124, 58, 237, 0.04)',
          }}
        />

        {/* Shield visual */}
        <View
          style={{
            width: 180,
            height: 210,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={180} height={210} viewBox="0 0 180 210">
            <Defs>
              <LinearGradient id="shieldFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={purpleLight} stopOpacity="0.18" />
                <Stop offset="100%" stopColor={purple} stopOpacity="0.08" />
              </LinearGradient>
              <LinearGradient
                id="shieldStroke"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={purpleLight} />
                <Stop offset="100%" stopColor={purple} />
              </LinearGradient>
            </Defs>
            {/* Outer shield glow */}
            <Path
              d="M90 12 L162 46 C162 46 168 120 90 195 C12 120 18 46 18 46 Z"
              fill="url(#shieldFill)"
            />
            {/* Inner shield outline */}
            <Path
              d="M90 28 L150 56 C150 56 154 118 90 180 C26 118 30 56 30 56 Z"
              fill="none"
              stroke="url(#shieldStroke)"
              strokeWidth={1.5}
              strokeOpacity={0.3}
            />
          </Svg>

          {/* Overlaid content */}
          <View style={{ position: 'absolute', alignItems: 'center', gap: 2 }}>
            <Ionicons name="shield-checkmark" size={36} color={purple} />
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 56,
                color: purple,
                lineHeight: 64,
                fontVariant: ['tabular-nums'],
              }}
            >
              68%
            </Text>
          </View>
        </View>

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
// Screen 5: "5 min A Day Is All It Takes"
// Visual: Clock face with highlighted 5-min arc + tick marks
// Color: Fresh green
// =================================================================
export function StatScreen5min({ step, onNext, onBack }: StatScreenProps) {
  const green = '#16A34A';
  const greenLight = '#22C55E';
  const greenBg = '#F0FDF4';
  const greenDeep = '#166534';

  const center = 90;
  const outerR = 76;
  const tickInner = 66;
  const tickOuter = 76;

  // 12 tick marks at 30-degree intervals
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angleDeg = i * 30 - 90;
    const angleRad = angleDeg * (Math.PI / 180);
    const isHour = i % 3 === 0;
    // First tick (12 o'clock) highlighted for the 5-min segment
    const isHighlighted = i === 0;
    return {
      x1: center + tickInner * Math.cos(angleRad),
      y1: center + tickInner * Math.sin(angleRad),
      x2: center + tickOuter * Math.cos(angleRad),
      y2: center + tickOuter * Math.sin(angleRad),
      isHour,
      isHighlighted,
    };
  });

  // 5-minute arc: 30 degrees from top (12 o'clock position)
  const arcR = 82;
  const startAngle = -90;
  const endAngle = -60;
  const sx = center + arcR * Math.cos((startAngle * Math.PI) / 180);
  const sy = center + arcR * Math.sin((startAngle * Math.PI) / 180);
  const ex = center + arcR * Math.cos((endAngle * Math.PI) / 180);
  const ey = center + arcR * Math.sin((endAngle * Math.PI) / 180);

  return (
    <StatShell step={step} onNext={onNext} onBack={onBack}>
      <View style={{ alignItems: 'center', gap: Spacing.xl }}>
        {/* Atmospheric glow */}
        <View
          style={{
            position: 'absolute',
            top: -40,
            width: 280,
            height: 280,
            borderRadius: 140,
            backgroundColor: 'rgba(34, 197, 94, 0.04)',
          }}
        />

        {/* Clock face */}
        <View
          style={{
            width: 190,
            height: 190,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Svg width={190} height={190} viewBox="0 0 180 180">
            {/* Clock circle */}
            <Circle
              cx={center}
              cy={center}
              r={outerR}
              stroke={greenLight}
              strokeOpacity={0.15}
              strokeWidth={2}
              fill="none"
            />
            {/* Inner subtle ring */}
            <Circle
              cx={center}
              cy={center}
              r={56}
              stroke={greenLight}
              strokeOpacity={0.08}
              strokeWidth={1}
              fill="none"
            />

            {/* Highlighted 5-minute arc */}
            <Path
              d={`M ${sx} ${sy} A ${arcR} ${arcR} 0 0 1 ${ex} ${ey}`}
              stroke={greenLight}
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
              opacity={0.5}
            />

            {/* Tick marks */}
            {ticks.map((t, i) => (
              <Line
                key={i}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={
                  t.isHighlighted
                    ? greenLight
                    : t.isHour
                      ? `${greenLight}`
                      : `${greenLight}`
                }
                strokeOpacity={t.isHighlighted ? 1 : t.isHour ? 0.4 : 0.2}
                strokeWidth={t.isHighlighted ? 3 : t.isHour ? 2 : 1.5}
                strokeLinecap="round"
              />
            ))}

            {/* Minute hand pointing to 1 (5 min position) */}
            <Line
              x1={center}
              y1={center}
              x2={center + 44 * Math.cos((-60 * Math.PI) / 180)}
              y2={center + 44 * Math.sin((-60 * Math.PI) / 180)}
              stroke={green}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            {/* Hour hand (shorter, pointing up) */}
            <Line
              x1={center}
              y1={center}
              x2={center}
              y2={center - 30}
              stroke={green}
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Center dot */}
            <Circle cx={center} cy={center} r={4} fill={green} />
          </Svg>
        </View>

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
