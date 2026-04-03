import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { PrimaryButton } from '@/components/ui/primary-button';

interface OnboardingLayoutProps {
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showProgress?: boolean;
  loading?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

export function OnboardingLayout({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = 'Continue',
  nextDisabled,
  showProgress = true,
  loading,
  onSkip,
  skipLabel,
}: OnboardingLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Top bar with back + progress */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: Spacing.xl,
            paddingVertical: Spacing.md,
            gap: Spacing.md,
          }}
        >
          {onBack && (
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
          )}
          {showProgress && (
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
                  width: `${(step / totalSteps) * 100}%`,
                  height: '100%',
                  backgroundColor: Colors.primary,
                  borderRadius: 2,
                }}
              />
            </View>
          )}
          {showProgress && (
            <Text
              style={{
                fontFamily: Fonts.medium,
                fontSize: 13,
                color: Colors.textTertiary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {step}/{totalSteps}
            </Text>
          )}
        </View>

        {/* Title area */}
        <View style={{ paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 28,
              color: Colors.text,
              lineHeight: 34,
            }}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontFamily: Fonts.regular,
                fontSize: 16,
                color: Colors.textSecondary,
                marginTop: Spacing.sm,
                lineHeight: 23,
              }}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: Spacing.xxl,
            paddingBottom: Spacing.huge,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>

        {/* Bottom button */}
        <View
          style={{
            paddingHorizontal: Spacing.xxl,
            paddingTop: Spacing.md,
            paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm,
            backgroundColor: Colors.background,
          }}
        >
          <PrimaryButton
            title={nextLabel}
            onPress={onNext}
            disabled={nextDisabled}
            loading={loading}
          />
          {onSkip && (
            <Pressable
              onPress={onSkip}
              hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
              style={{ paddingVertical: Spacing.md, alignItems: 'center' }}
            >
              <Text
                style={{
                  fontFamily: Fonts.medium,
                  fontSize: 15,
                  color: Colors.textTertiary,
                }}
              >
                {skipLabel || 'Skip for now'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
