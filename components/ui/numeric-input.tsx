import React from 'react';
import { View, TextInput, Text, Pressable } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Radius, Spacing } from '@/constants/Layout';

interface NumericInputProps {
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  units?: string[];
  selectedUnit?: string;
  onUnitChange?: (u: string) => void;
  placeholder?: string;
  large?: boolean;
}

export function NumericInput({
  value,
  onChangeText,
  unit,
  units,
  selectedUnit,
  onUnitChange,
  placeholder = '0',
  large,
}: NumericInputProps) {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.lg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: Spacing.sm,
        }}
      >
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          style={{
            fontFamily: Fonts.bold,
            fontSize: large ? 56 : 44,
            color: Colors.text,
            textAlign: 'center',
            minWidth: 120,
          }}
        />
        {unit && (
          <Text
            style={{
              fontFamily: Fonts.medium,
              fontSize: 22,
              color: Colors.textSecondary,
            }}
          >
            {unit}
          </Text>
        )}
      </View>

      {units && units.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: Colors.borderLight,
            borderRadius: Radius.md,
            padding: 3,
            borderCurve: 'continuous',
          }}
        >
          {units.map((u) => (
            <Pressable
              key={u}
              onPress={() => onUnitChange?.(u)}
              style={{
                paddingVertical: Spacing.sm,
                paddingHorizontal: Spacing.xl,
                borderRadius: Radius.sm,
                backgroundColor: selectedUnit === u ? Colors.surface : 'transparent',
                borderCurve: 'continuous',
                boxShadow: selectedUnit === u ? '0px 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              <Text
                style={{
                  fontFamily: selectedUnit === u ? Fonts.semiBold : Fonts.medium,
                  fontSize: 14,
                  color: selectedUnit === u ? Colors.primary : Colors.textSecondary,
                }}
              >
                {u}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
