import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Radius, Spacing } from '@/constants/Layout';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  elevated?: boolean;
}

export function Card({ children, style, elevated }: CardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderRadius: Radius.md,
          padding: Spacing.lg,
          borderCurve: 'continuous',
          boxShadow: elevated ? Colors.cardShadowElevated : Colors.cardShadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
