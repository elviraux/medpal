import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import type { InjectionSite } from '@/store/types';

interface BodyDiagramProps {
  selectedSite?: InjectionSite;
  suggestedSite?: InjectionSite;
  onSelectSite: (site: InjectionSite) => void;
}

const siteLabels: Record<InjectionSite, string> = {
  abdomen_left: 'Abdomen Left',
  abdomen_right: 'Abdomen Right',
  thigh_left: 'Thigh Left',
  thigh_right: 'Thigh Right',
  upper_arm_left: 'Upper Arm Left',
  upper_arm_right: 'Upper Arm Right',
};

interface SitePosition {
  cx: number;
  cy: number;
}

const sitePositions: Record<InjectionSite, SitePosition> = {
  upper_arm_left: { cx: 28, cy: 72 },
  upper_arm_right: { cx: 112, cy: 72 },
  abdomen_left: { cx: 55, cy: 100 },
  abdomen_right: { cx: 85, cy: 100 },
  thigh_left: { cx: 55, cy: 155 },
  thigh_right: { cx: 85, cy: 155 },
};

export function BodyDiagram({
  selectedSite,
  suggestedSite,
  onSelectSite,
}: BodyDiagramProps) {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.lg }}>
      {/* SVG body outline */}
      <View style={{ width: 200, height: 240, position: 'relative' }}>
        <Svg width={200} height={240} viewBox="0 0 140 200">
          {/* Head */}
          <Circle cx={70} cy={22} r={16} fill={Colors.primaryLight} stroke={Colors.primary} strokeWidth={1.5} />
          {/* Neck */}
          <Rect x={64} y={38} width={12} height={10} fill={Colors.primaryLight} stroke={Colors.primary} strokeWidth={1} />
          {/* Torso */}
          <Rect x={42} y={48} width={56} height={60} rx={8} fill={Colors.primaryLight} stroke={Colors.primary} strokeWidth={1.5} />
          {/* Left arm */}
          <Rect x={20} y={52} width={20} height={50} rx={8} fill={Colors.primaryLight} stroke={Colors.primary} strokeWidth={1.5} />
          {/* Right arm */}
          <Rect x={100} y={52} width={20} height={50} rx={8} fill={Colors.primaryLight} stroke={Colors.primary} strokeWidth={1.5} />
          {/* Left leg */}
          <Rect x={44} y={110} width={24} height={70} rx={8} fill={Colors.primaryLight} stroke={Colors.primary} strokeWidth={1.5} />
          {/* Right leg */}
          <Rect x={72} y={110} width={24} height={70} rx={8} fill={Colors.primaryLight} stroke={Colors.primary} strokeWidth={1.5} />

          {/* Injection site dots */}
          {(Object.entries(sitePositions) as [InjectionSite, SitePosition][]).map(
            ([site, pos]) => {
              const isSelected = selectedSite === site;
              const isSuggested = suggestedSite === site;
              return (
                <React.Fragment key={site}>
                  {isSuggested && !isSelected && (
                    <Circle
                      cx={pos.cx}
                      cy={pos.cy}
                      r={9}
                      fill="none"
                      stroke={Colors.accent}
                      strokeWidth={1.5}
                      strokeDasharray="3,3"
                    />
                  )}
                  <Circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r={6}
                    fill={isSelected ? Colors.primary : isSuggested ? Colors.accentLight : Colors.borderLight}
                    stroke={isSelected ? Colors.primary : isSuggested ? Colors.accent : Colors.border}
                    strokeWidth={1.5}
                    onPress={() => onSelectSite(site)}
                  />
                </React.Fragment>
              );
            }
          )}
        </Svg>
      </View>

      {/* Site selection pills */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center' }}>
        {(Object.entries(siteLabels) as [InjectionSite, string][]).map(([site, label]) => (
          <Pressable
            key={site}
            onPress={() => onSelectSite(site)}
            style={{
              paddingVertical: Spacing.sm,
              paddingHorizontal: Spacing.md,
              borderRadius: Radius.xl,
              backgroundColor: selectedSite === site ? Colors.primary : suggestedSite === site ? Colors.accentLight : Colors.borderLight,
              borderWidth: 1,
              borderColor: selectedSite === site ? Colors.primary : suggestedSite === site ? Colors.accent : Colors.border,
              borderCurve: 'continuous',
            }}
          >
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 12,
                color: selectedSite === site ? '#fff' : Colors.text,
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedSite && (
        <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.primary }}>
          Selected: {siteLabels[selectedSite]}
        </Text>
      )}
    </View>
  );
}
