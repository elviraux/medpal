import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { PrimaryButton } from './primary-button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xxxl,
        gap: Spacing.lg,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: Colors.primaryLight,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Ionicons name={icon} size={32} color={Colors.primary} />
      </View>
      <Text
        style={{
          fontFamily: Fonts.semiBold,
          fontSize: 18,
          color: Colors.text,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontFamily: Fonts.regular,
          fontSize: 15,
          color: Colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
        }}
      >
        {message}
      </Text>
      {actionLabel && onAction && (
        <PrimaryButton title={actionLabel} onPress={onAction} small style={{ marginTop: Spacing.sm }} />
      )}
    </View>
  );
}
