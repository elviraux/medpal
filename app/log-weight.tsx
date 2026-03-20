import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { generateId } from '@/utils/date';

export default function LogWeightScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addWeightLog = useAppStore((s) => s.addWeightLog);
  const setUserProfile = useAppStore((s) => s.setUserProfile);

  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      Alert.alert('Invalid weight', 'Please enter a valid weight.');
      return;
    }
    addWeightLog({
      id: generateId(),
      date: date.toISOString().split('T')[0],
      weight: w,
      notes: notes || undefined,
    });
    setUserProfile({ currentWeight: w });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: insets.top + Spacing.md,
          paddingHorizontal: Spacing.xl,
          paddingBottom: Spacing.md,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ fontFamily: Fonts.medium, fontSize: 16, color: Colors.primary }}>Cancel</Text>
        </Pressable>
        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.text }}>Log Weight</Text>
        <Pressable onPress={handleSave} hitSlop={10}>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.primary }}>Save</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.xl,
          paddingBottom: insets.bottom + 40,
          gap: Spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Weight Input */}
        <View style={{ alignItems: 'center', paddingVertical: Spacing.xxl }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm }}>
            <TextInput
              value={weight}
              onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              style={{
                fontFamily: Fonts.bold,
                fontSize: 56,
                color: Colors.text,
                textAlign: 'center',
                minWidth: 140,
              }}
            />
            <Text style={{ fontFamily: Fonts.medium, fontSize: 22, color: Colors.textSecondary }}>
              lbs
            </Text>
          </View>
        </View>

        {/* Date */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>
            Date
          </Text>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            maximumDate={new Date()}
            onChange={(_, d) => { if (d) setDate(d); }}
          />
        </Card>

        {/* Notes */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How are you feeling?"
            placeholderTextColor={Colors.textTertiary}
            multiline
            style={{
              fontFamily: Fonts.regular,
              fontSize: 15,
              color: Colors.text,
              minHeight: 60,
              textAlignVertical: 'top',
            }}
          />
        </Card>

        <PrimaryButton title="Save Weight" onPress={handleSave} disabled={!weight} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
