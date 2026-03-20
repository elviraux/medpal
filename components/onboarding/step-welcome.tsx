import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/ui/primary-button';

interface StepWelcomeProps {
  onNext: () => void;
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xxxl,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.xxl }}>
        {/* Logo */}
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 28,
            backgroundColor: Colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            borderCurve: 'continuous',
            boxShadow: '0px 8px 32px rgba(26, 111, 212, 0.35)',
          }}
        >
          <Ionicons name="pulse" size={48} color="#fff" />
        </View>

        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Text
            style={{
              fontFamily: Fonts.bold,
              fontSize: 38,
              color: Colors.text,
              letterSpacing: -1,
            }}
          >
            Slimsy
          </Text>
          <Text
            style={{
              fontFamily: Fonts.regular,
              fontSize: 17,
              color: Colors.textSecondary,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            Your GLP-1 journey,{'\n'}tracked with care
          </Text>
        </View>

        {/* Feature highlights */}
        <View style={{ gap: Spacing.lg, paddingTop: Spacing.xl }}>
          {[
            { icon: 'medkit-outline' as const, text: 'Track your medication schedule' },
            { icon: 'restaurant-outline' as const, text: 'AI-powered food logging' },
            { icon: 'trending-down-outline' as const, text: 'Monitor your weight journey' },
          ].map((item) => (
            <View key={item.text} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: Colors.primaryLight,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderCurve: 'continuous',
                }}
              >
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ width: '100%', paddingBottom: Spacing.lg }}>
        <PrimaryButton title="Start your journey" onPress={onNext} />
      </View>
    </View>
  );
}
