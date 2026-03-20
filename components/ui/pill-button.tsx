import React from 'react';
import { Pressable, Text, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Radius, Spacing } from '@/constants/Layout';
import * as Haptics from 'expo-haptics';

interface PillButtonProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export function PillButton({
  label,
  selected,
  onPress,
  style,
  disabled,
}: PillButtonProps) {
  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.xl,
          borderRadius: Radius.xl,
          borderWidth: 1.5,
          borderColor: selected ? Colors.primary : Colors.border,
          backgroundColor: selected ? Colors.primaryLight : Colors.surface,
          opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
          borderCurve: 'continuous',
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: selected ? Fonts.semiBold : Fonts.medium,
          fontSize: 15,
          color: selected ? Colors.primary : Colors.text,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
