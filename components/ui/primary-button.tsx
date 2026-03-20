import React from 'react';
import { Pressable, Text, ActivityIndicator, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Radius, Spacing } from '@/constants/Layout';
import * as Haptics from 'expo-haptics';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
  small?: boolean;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
  small,
}: PrimaryButtonProps) {
  const handlePress = () => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  };

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: small ? 44 : 54,
          borderRadius: small ? Radius.md : Radius.lg,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: Spacing.xxl,
          backgroundColor: isPrimary ? Colors.primary : 'transparent',
          borderWidth: isOutline ? 1.5 : 0,
          borderColor: isOutline ? Colors.primary : 'transparent',
          opacity: pressed ? 0.85 : disabled ? 0.5 : 1,
          borderCurve: 'continuous',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#fff' : Colors.primary} />
      ) : (
        <Text
          style={{
            fontFamily: Fonts.semiBold,
            fontSize: small ? 15 : 17,
            color: isPrimary ? '#fff' : Colors.primary,
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
