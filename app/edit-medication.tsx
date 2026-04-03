import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { PillButton } from '@/components/ui/pill-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import type {
  MedicationType,
  DeliveryType,
  Frequency,
  DeviceType,
} from '@/store/types';

const medications: MedicationType[] = [
  'Wegovy', 'Ozempic', 'Zepbound', 'Mounjaro',
  'Semaglutide', 'Tirzepatide', 'Other',
];

const deliveryTypes: { label: string; value: DeliveryType; icon: string }[] = [
  { label: 'Injection', value: 'injection', icon: 'medkit-outline' },
  { label: 'Pill', value: 'pill', icon: 'tablet-portrait-outline' },
];

const injectionDoses = ['0.25mg', '0.5mg', '1mg', '1.5mg', '2mg', '2.4mg'];
const pillDoses = ['1.5mg', '4mg', '7mg', '9mg', '14mg', '25mg'];

const deviceTypes: { label: string; value: DeviceType; icon: string }[] = [
  { label: 'Single-use pen', value: 'single_use_pen', icon: 'pencil-outline' },
  { label: 'Auto-injector', value: 'auto_injector', icon: 'flash-outline' },
  { label: 'Syringe & vial', value: 'syringe_vial', icon: 'eyedrop-outline' },
  { label: 'Other', value: 'other', icon: 'ellipsis-horizontal-outline' },
];

const frequencies: { label: string; value: Frequency; desc: string }[] = [
  { label: 'Every 7 days', value: 'every_7_days', desc: 'Weekly' },
  { label: 'Every 14 days', value: 'every_14_days', desc: 'Bi-weekly' },
  { label: 'Daily', value: 'daily', desc: 'Every day' },
  { label: 'Custom', value: 'custom', desc: 'Set your own schedule' },
];

export default function EditMedicationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile, setUserProfile } = useAppStore();

  const [medication, setMedication] = useState<MedicationType | undefined>(
    userProfile.medication
  );
  const [deliveryType, setDeliveryType] = useState<DeliveryType | undefined>(
    userProfile.deliveryType
  );
  const [dose, setDose] = useState<string>(userProfile.dose ?? '');
  const [customDose, setCustomDose] = useState('');
  const [frequency, setFrequency] = useState<Frequency | undefined>(
    userProfile.frequency
  );
  const [customFrequencyDays, setCustomFrequencyDays] = useState(
    String(userProfile.customFrequencyDays ?? '')
  );
  const [deviceType, setDeviceType] = useState<DeviceType | undefined>(
    userProfile.deviceType
  );

  const isInjection = deliveryType === 'injection';
  const doseOptions = isInjection ? injectionDoses : pillDoses;
  const isCustomDose = dose !== '' && !doseOptions.includes(dose);

  // Initialize customDose if current dose isn't in preset list
  React.useEffect(() => {
    if (userProfile.dose && !injectionDoses.includes(userProfile.dose) && !pillDoses.includes(userProfile.dose)) {
      setCustomDose(userProfile.dose);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    const finalDose = isCustomDose ? customDose : dose;
    setUserProfile({
      medication,
      deliveryType,
      dose: finalDose || undefined,
      frequency,
      customFrequencyDays: frequency === 'custom' ? parseInt(customFrequencyDays) || undefined : undefined,
      deviceType: isInjection ? deviceType : undefined,
    });
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
          backgroundColor: Colors.background,
          borderBottomWidth: 1,
          borderBottomColor: Colors.borderLight,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ minWidth: 60 }}>
          <Text style={{ fontFamily: Fonts.medium, fontSize: 16, color: Colors.primary }}>
            Cancel
          </Text>
        </Pressable>
        <Text style={{ fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.text }}>
          Medication
        </Text>
        <Pressable onPress={handleSave} hitSlop={10} style={{ minWidth: 60, alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.primary }}>
            Save
          </Text>
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
        {/* Medication Name */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text, marginBottom: Spacing.md }}>
            Medication
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {medications.map((med) => (
              <PillButton
                key={med}
                label={med}
                selected={medication === med}
                onPress={() => setMedication(med)}
                style={{ paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg }}
              />
            ))}
          </View>
        </Card>

        {/* Delivery Type */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text, marginBottom: Spacing.md }}>
            Delivery Type
          </Text>
          <View style={{ gap: Spacing.sm }}>
            {deliveryTypes.map((dt) => (
              <Pressable
                key={dt.value}
                onPress={() => {
                  setDeliveryType(dt.value);
                  // Reset dose when switching delivery type
                  if (dt.value !== deliveryType) {
                    setDose('');
                    setCustomDose('');
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: Spacing.lg,
                  borderRadius: Radius.md,
                  borderWidth: 1.5,
                  borderColor: deliveryType === dt.value ? Colors.primary : Colors.border,
                  backgroundColor: deliveryType === dt.value ? Colors.primaryLight : Colors.surface,
                  gap: Spacing.md,
                  borderCurve: 'continuous',
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: deliveryType === dt.value ? Colors.primary : Colors.borderLight,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderCurve: 'continuous',
                  }}
                >
                  <Ionicons
                    name={dt.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={deliveryType === dt.value ? '#fff' : Colors.textSecondary}
                  />
                </View>
                <Text
                  style={{
                    fontFamily: deliveryType === dt.value ? Fonts.semiBold : Fonts.medium,
                    fontSize: 16,
                    color: deliveryType === dt.value ? Colors.primary : Colors.text,
                  }}
                >
                  {dt.label}
                </Text>
                {deliveryType === dt.value && (
                  <View style={{ marginLeft: 'auto' }}>
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </Card>

        {/* Current Dose */}
        {deliveryType && (
          <Card>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text, marginBottom: Spacing.md }}>
              Current Dose
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {doseOptions.map((d) => (
                <PillButton
                  key={d}
                  label={d}
                  selected={dose === d && !isCustomDose}
                  onPress={() => {
                    setDose(d);
                    setCustomDose('');
                  }}
                  style={{ paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg }}
                />
              ))}
              <PillButton
                label="Custom"
                selected={isCustomDose}
                onPress={() => {
                  setDose('custom');
                  setCustomDose(customDose || '');
                }}
                style={{ paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg }}
              />
            </View>
            {isCustomDose && (
              <View
                style={{
                  marginTop: Spacing.md,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: Colors.borderLight,
                  borderRadius: Radius.md,
                  paddingHorizontal: Spacing.lg,
                  borderCurve: 'continuous',
                }}
              >
                <TextInput
                  value={customDose}
                  onChangeText={setCustomDose}
                  placeholder="Enter dose (e.g. 1.7mg)"
                  placeholderTextColor={Colors.textTertiary}
                  style={{
                    flex: 1,
                    fontFamily: Fonts.medium,
                    fontSize: 15,
                    color: Colors.text,
                    paddingVertical: Spacing.md,
                  }}
                />
              </View>
            )}
          </Card>
        )}

        {/* Frequency */}
        <Card>
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text, marginBottom: Spacing.md }}>
            Frequency
          </Text>
          <View style={{ gap: Spacing.sm }}>
            {frequencies.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => setFrequency(f.value)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  borderRadius: Radius.md,
                  borderWidth: 1.5,
                  borderColor: frequency === f.value ? Colors.primary : Colors.border,
                  backgroundColor: frequency === f.value ? Colors.primaryLight : Colors.surface,
                  borderCurve: 'continuous',
                }}
              >
                <View>
                  <Text
                    style={{
                      fontFamily: frequency === f.value ? Fonts.semiBold : Fonts.medium,
                      fontSize: 15,
                      color: frequency === f.value ? Colors.primary : Colors.text,
                    }}
                  >
                    {f.label}
                  </Text>
                  <Text
                    style={{
                      fontFamily: Fonts.regular,
                      fontSize: 12,
                      color: Colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {f.desc}
                  </Text>
                </View>
                {frequency === f.value && (
                  <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
          {frequency === 'custom' && (
            <View
              style={{
                marginTop: Spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: Colors.borderLight,
                borderRadius: Radius.md,
                paddingHorizontal: Spacing.lg,
                borderCurve: 'continuous',
                gap: Spacing.sm,
              }}
            >
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.textSecondary }}>
                Every
              </Text>
              <TextInput
                value={customFrequencyDays}
                onChangeText={(t) => setCustomFrequencyDays(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                style={{
                  fontFamily: Fonts.semiBold,
                  fontSize: 18,
                  color: Colors.text,
                  paddingVertical: Spacing.md,
                  minWidth: 40,
                  textAlign: 'center',
                }}
              />
              <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.textSecondary }}>
                days
              </Text>
            </View>
          )}
        </Card>

        {/* Device Type (injection only) */}
        {isInjection && (
          <Card>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text, marginBottom: Spacing.md }}>
              Device Type
            </Text>
            <View style={{ gap: Spacing.sm }}>
              {deviceTypes.map((dt) => (
                <Pressable
                  key={dt.value}
                  onPress={() => setDeviceType(dt.value)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: Spacing.lg,
                    borderRadius: Radius.md,
                    borderWidth: 1.5,
                    borderColor: deviceType === dt.value ? Colors.primary : Colors.border,
                    backgroundColor: deviceType === dt.value ? Colors.primaryLight : Colors.surface,
                    gap: Spacing.md,
                    borderCurve: 'continuous',
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: deviceType === dt.value ? Colors.primary : Colors.borderLight,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderCurve: 'continuous',
                    }}
                  >
                    <Ionicons
                      name={dt.icon as keyof typeof Ionicons.glyphMap}
                      size={18}
                      color={deviceType === dt.value ? '#fff' : Colors.textSecondary}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: deviceType === dt.value ? Fonts.semiBold : Fonts.medium,
                      fontSize: 15,
                      color: deviceType === dt.value ? Colors.primary : Colors.text,
                      flex: 1,
                    }}
                  >
                    {dt.label}
                  </Text>
                  {deviceType === dt.value && (
                    <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        <PrimaryButton
          title="Save Changes"
          onPress={handleSave}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
