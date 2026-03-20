import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useImageAnalysis } from '@fastshot/ai';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { useAppStore } from '@/store/useAppStore';
import { Card } from '@/components/ui/card';
import { PillButton } from '@/components/ui/pill-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { getTodayString, generateId } from '@/utils/date';
import type { MealType } from '@/store/types';

const mealTypes: { label: string; value: MealType }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch', value: 'lunch' },
  { label: 'Dinner', value: 'dinner' },
  { label: 'Snack', value: 'snack' },
];

export default function LogFoodScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const addFoodLog = useAppStore((s) => s.addFoodLog);

  const [mealType, setMealType] = useState<MealType>('lunch');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fiber, setFiber] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { analyzeImage } = useImageAnalysis();

  const takePhoto = async () => {
    try {
      const permResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take food photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        await analyzeFood(uri);
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Error', 'Failed to open camera.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setPhotoUri(uri);
        await analyzeFood(uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const analyzeFood = async (uri: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeImage({
        imageUrl: uri,
        prompt: 'Analyze this food photo. Identify the food items and estimate: 1) Total calories (kcal), 2) Protein (grams), 3) Fiber (grams). Return ONLY a JSON object like: {"description": "food description", "calories": 350, "protein": 25, "fiber": 5}. Be as accurate as possible.',
      });
      if (result) {
        try {
          // Try to parse JSON from the response
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.description) setDescription(parsed.description);
            if (parsed.calories) setCalories(String(Math.round(parsed.calories)));
            if (parsed.protein) setProtein(String(Math.round(parsed.protein)));
            if (parsed.fiber) setFiber(String(Math.round(parsed.fiber)));
          } else {
            setDescription(result);
          }
        } catch {
          setDescription(result);
        }
      }
    } catch (err) {
      console.error('AI analysis error:', err);
      Alert.alert('Analysis Error', 'Could not analyze the food photo. Please enter details manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    const cal = parseInt(calories, 10);
    if (!cal || cal <= 0) {
      Alert.alert('Missing info', 'Please enter at least the calories.');
      return;
    }
    addFoodLog({
      id: generateId(),
      date: getTodayString(),
      mealType,
      photoUri: photoUri ?? undefined,
      aiDescription: description || undefined,
      calories: cal,
      protein: parseInt(protein, 10) || 0,
      fiber: parseInt(fiber, 10) || 0,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ flex: 1 }}>
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
          <Text style={{ fontFamily: Fonts.semiBold, fontSize: 17, color: Colors.text }}>Log Food</Text>
          <Pressable onPress={handleSave} hitSlop={10}>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.primary }}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: Spacing.xl,
            paddingBottom: insets.bottom + 40,
            gap: Spacing.lg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Meal Type */}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {mealTypes.map((mt) => (
              <PillButton
                key={mt.value}
                label={mt.label}
                selected={mealType === mt.value}
                onPress={() => setMealType(mt.value)}
                style={{ flex: 1, paddingHorizontal: Spacing.sm }}
              />
            ))}
          </View>

          {/* Photo Area */}
          <Card>
            {photoUri ? (
              <View style={{ gap: Spacing.md }}>
                <Image
                  source={{ uri: photoUri }}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: Radius.md,
                  }}
                  contentFit="cover"
                />
                {isAnalyzing && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: Spacing.sm,
                      paddingVertical: Spacing.sm,
                    }}
                  >
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.primary }}>
                      Analyzing food...
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={() => setPhotoUri(null)}
                  style={{ alignSelf: 'center' }}
                >
                  <Text style={{ fontFamily: Fonts.medium, fontSize: 14, color: Colors.error }}>
                    Remove photo
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: Spacing.md }}>
                <Text style={{ fontFamily: Fonts.semiBold, fontSize: 16, color: Colors.text, textAlign: 'center' }}>
                  Take a photo for AI analysis
                </Text>
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  <Pressable
                    onPress={takePhoto}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 100,
                      borderRadius: Radius.md,
                      backgroundColor: Colors.primaryLight,
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: Spacing.sm,
                      borderCurve: 'continuous',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name="camera-outline" size={30} color={Colors.primary} />
                    <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.primary }}>
                      Camera
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={pickImage}
                    style={({ pressed }) => ({
                      flex: 1,
                      height: 100,
                      borderRadius: Radius.md,
                      backgroundColor: Colors.borderLight,
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: Spacing.sm,
                      borderCurve: 'continuous',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons name="images-outline" size={30} color={Colors.textSecondary} />
                    <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textSecondary }}>
                      Gallery
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Card>

          {/* Description */}
          <Card>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.sm }}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What did you eat?"
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

          {/* Macro Inputs */}
          <Card>
            <Text style={{ fontFamily: Fonts.semiBold, fontSize: 15, color: Colors.text, marginBottom: Spacing.md }}>
              Nutrition
            </Text>
            <View style={{ gap: Spacing.md }}>
              <MacroInput label="Calories" value={calories} onChangeText={setCalories} unit="kcal" color={Colors.primary} />
              <MacroInput label="Protein" value={protein} onChangeText={setProtein} unit="g" color="#F97316" />
              <MacroInput label="Fiber" value={fiber} onChangeText={setFiber} unit="g" color={Colors.accent} />
            </View>
          </Card>

          <PrimaryButton title="Save Food Log" onPress={handleSave} disabled={!calories} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function MacroInput({
  label,
  value,
  onChangeText,
  unit,
  color,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  unit: string;
  color: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text, flex: 1 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: Colors.borderLight,
          borderRadius: Radius.sm,
          paddingHorizontal: Spacing.md,
          borderCurve: 'continuous',
        }}
      >
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={Colors.textTertiary}
          style={{
            fontFamily: Fonts.semiBold,
            fontSize: 16,
            color: Colors.text,
            minWidth: 60,
            height: 44,
            textAlign: 'right',
          }}
        />
        <Text
          style={{
            fontFamily: Fonts.regular,
            fontSize: 13,
            color: Colors.textSecondary,
            marginLeft: Spacing.xs,
          }}
        >
          {unit}
        </Text>
      </View>
    </View>
  );
}
