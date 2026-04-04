import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { computePkModel } from '@/utils/pharmacokinetics';
import { Ionicons } from '@expo/vector-icons';

interface Glp1LevelChartProps {
  width: number;
}

export function Glp1LevelChart({ width }: Glp1LevelChartProps) {
  const userProfile = useAppStore((s) => s.userProfile);
  const medicationLogs = useAppStore((s) => s.medicationLogs);

  const pk = useMemo(
    () =>
      computePkModel(
        medicationLogs,
        userProfile.medication,
        userProfile.deliveryType,
        userProfile.frequency
      ),
    [medicationLogs, userProfile.medication, userProfile.deliveryType, userProfile.frequency]
  );

  const hasDoses = medicationLogs.length > 0;
  const chartW = Math.max(width, 200);
  const chartH = 90;
  const padX = 6;
  const padY = 8;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;
  const baseY = padY + plotH;

  // Build the SVG path from PK curve points
  const { curvePath, areaPath, dotX, dotY } = useMemo(() => {
    if (!hasDoses || pk.curve.length === 0) {
      return { curvePath: '', areaPath: '', dotX: 0, dotY: 0 };
    }

    const points = pk.curve.map((pt) => ({
      x: padX + (pt.hourInCycle / pk.cycleLengthHours) * plotW,
      y: baseY - pt.level * plotH * 0.92,
    }));

    let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x.toFixed(1)},${points[i].y.toFixed(1)}`;
    }

    const area = `${d} L ${points[points.length - 1].x.toFixed(1)},${baseY} L ${points[0].x.toFixed(1)},${baseY} Z`;

    // Current position dot
    const progress = Math.min(1, pk.currentHourInCycle / pk.cycleLengthHours);
    const idx = Math.min(Math.round(progress * (points.length - 1)), points.length - 1);
    const dx = points[idx]?.x ?? 0;
    const dy = points[idx]?.y ?? 0;

    return { curvePath: d, areaPath: area, dotX: dx, dotY: dy };
  }, [hasDoses, pk, plotW, plotH, baseY, padX]);

  const daysSince = hasDoses ? Math.floor(pk.daysSinceLastDose) : null;
  const daysUntil = hasDoses ? Math.max(0, Math.ceil(pk.daysUntilNextDose)) : null;
  const levelPct = hasDoses ? pk.currentLevelPct : 0;

  return (
    <Card elevated>
      <View style={{ gap: Spacing.md }}>
        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text }}>
          Estimated GLP-1 Level
        </Text>

        <View style={{ height: chartH, justifyContent: 'center', alignItems: 'center' }}>
          {hasDoses ? (
            <Svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
              <Defs>
                <LinearGradient id="glpFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={Colors.primary} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Baseline */}
              <Line
                x1={padX}
                y1={baseY}
                x2={padX + plotW}
                y2={baseY}
                stroke={Colors.borderLight}
                strokeWidth={1}
              />

              {/* Area fill */}
              <Path d={areaPath} fill="url(#glpFill)" />

              {/* Curve */}
              <Path
                d={curvePath}
                stroke={Colors.primary}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Current position dot */}
              <Circle cx={dotX} cy={dotY} r={5.5} fill={Colors.surface} stroke={Colors.primary} strokeWidth={2.5} />
            </Svg>
          ) : (
            <View style={{ alignItems: 'center', gap: Spacing.sm }}>
              <Ionicons name="pulse-outline" size={28} color={Colors.textTertiary} />
              <Text
                style={{
                  fontFamily: Fonts.regular,
                  fontSize: 13,
                  color: Colors.textTertiary,
                  textAlign: 'center',
                  lineHeight: 18,
                }}
              >
                Log your first dose for{'\n'}personalized tracking
              </Text>
            </View>
          )}
        </View>

        {/* Metric row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 20,
                color: Colors.primary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {daysSince ?? '--'}
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
              days since dose
            </Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 20,
                color: Colors.accent,
                fontVariant: ['tabular-nums'],
              }}
            >
              {daysUntil ?? '--'}
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
              next dose in
            </Text>
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text
              style={{
                fontFamily: Fonts.bold,
                fontSize: 20,
                color: Colors.text,
                fontVariant: ['tabular-nums'],
              }}
            >
              {hasDoses ? `${levelPct}%` : '--'}
            </Text>
            <Text style={{ fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary }}>
              est. level
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}
