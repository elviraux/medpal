import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Polyline, Line, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import type { WeightLog } from '@/store/types';
import { displayWeight } from '@/utils/units';
import type { UnitSystem } from '@/utils/units';

interface WeightChartProps {
  data: WeightLog[];
  goalWeight?: number;
  width?: number;
  height?: number;
  units?: UnitSystem;
}

export function WeightChart({
  data,
  goalWeight,
  width = 320,
  height = 180,
  units = 'imperial',
}: WeightChartProps) {
  if (data.length === 0) {
    return (
      <View
        style={{
          width,
          height,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text style={{ fontFamily: Fonts.regular, fontSize: 14, color: Colors.textTertiary }}>
          No weight data yet
        </Text>
      </View>
    );
  }

  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Convert stored lbs to display unit for charting
  const weights = sorted.map((d) => displayWeight(d.weight, units));
  const goalDisplay = goalWeight != null ? displayWeight(goalWeight, units) : undefined;
  const allValues = goalDisplay != null ? [...weights, goalDisplay] : weights;
  const minW = Math.min(...allValues) - 2;
  const maxW = Math.max(...allValues) + 2;
  const range = maxW - minW || 1;

  const padX = 10;
  const padY = 20;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const points = sorted.map((d, i) => {
    const x = padX + (sorted.length > 1 ? (i / (sorted.length - 1)) * chartW : chartW / 2);
    const displayW = displayWeight(d.weight, units);
    const y = padY + chartH - ((displayW - minW) / range) * chartH;
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const goalY = goalDisplay != null
    ? padY + chartH - ((goalDisplay - minW) / range) * chartH
    : null;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.15" />
            <Stop offset="1" stopColor={Colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Fill area under the curve */}
        {points.length > 1 && (
          <Polyline
            points={`${padX},${padY + chartH} ${polylinePoints} ${padX + chartW},${padY + chartH}`}
            fill="url(#lineGrad)"
            stroke="none"
          />
        )}

        {/* Goal line */}
        {goalY != null && (
          <Line
            x1={padX}
            y1={goalY}
            x2={padX + chartW}
            y2={goalY}
            stroke={Colors.accent}
            strokeWidth={1}
            strokeDasharray="5,5"
          />
        )}

        {/* Main line */}
        {points.length > 1 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={Colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill={Colors.surface}
            stroke={Colors.primary}
            strokeWidth={2}
          />
        ))}
      </Svg>

      {/* Labels */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: padX,
        }}
      >
        {sorted.length > 0 && (
          <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary }}>
            {new Date(sorted[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        )}
        {sorted.length > 1 && (
          <Text style={{ fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary }}>
            {new Date(sorted[sorted.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        )}
      </View>
    </View>
  );
}
