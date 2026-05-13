import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { adapty, AdaptyPaywallProduct } from 'react-native-adapty';
import { useAppStore } from '@/store/useAppStore';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { Spacing, Radius } from '@/constants/Layout';
import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';

interface PaywallProps {
  onComplete: () => void;
  onClose?: () => void;
}

export function Paywall({ onComplete, onClose }: PaywallProps) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<AdaptyPaywallProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const setPremiumStatus = useAppStore((state) => state.setPremiumStatus);

  useEffect(() => {
    const fetchPaywall = async () => {
      try {
        const paywall = await adapty.getPaywall('onboarding');
        await adapty.logShowPaywall(paywall);
        const fetchedProducts = await adapty.getPaywallProducts(paywall);
        if (fetchedProducts.length > 0) {
          setProducts(fetchedProducts);
          setSelectedProductId(fetchedProducts[0].vendorProductId);
        }
      } catch (error) {
        // Fallback or handle error
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaywall();
  }, []);

  const handleSubscribe = async () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.vendorProductId === selectedProductId);
    if (!product) return;

    setIsPurchasing(true);
    try {
      const result = await adapty.makePurchase(product) as any;
      if (result?.profile?.accessLevels?.['premium']?.isActive || result?.accessLevels?.['premium']?.isActive) {
        setPremiumStatus(true);
        onComplete();
      } else {
        // Did not unlock
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert('Purchase failed', 'Something went wrong while trying to complete your purchase.');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsPurchasing(true);
    try {
      const profile = await adapty.restorePurchases() as any;
      if (profile?.accessLevels?.['premium']?.isActive) {
        setPremiumStatus(true);
        Alert.alert('Success', 'Your purchases have been restored.', [{ text: 'OK', onPress: onComplete }]);
      } else {
        Alert.alert('No purchases found', 'We could not find an active subscription for your account.');
      }
    } catch (error) {
      Alert.alert('Restore failed', 'Something went wrong while trying to restore your purchases.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const renderProducts = () => {
    if (isLoading) {
      return (
        <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (products.length === 0) {
      // Fallback static UI
      return (
        <View style={{ gap: Spacing.md }}>
          <Pressable onPress={() => setSelectedProductId('yearly')}>
            <Card elevated={selectedProductId === 'yearly'} style={{ borderWidth: 2, borderColor: selectedProductId === 'yearly' ? Colors.primary : Colors.border, gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedProductId === 'yearly' ? Colors.primary : Colors.border, justifyContent: 'center', alignItems: 'center' }}>
                  {selectedProductId === 'yearly' && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>Yearly</Text>
                      <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>7-day free trial</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>$39.99</Text>
                      <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>/year</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={{ gap: Spacing.md }}>
        {products.map((product) => (
          <Pressable key={product.vendorProductId} onPress={() => setSelectedProductId(product.vendorProductId)}>
            <Card elevated={selectedProductId === product.vendorProductId} style={{ borderWidth: 2, borderColor: selectedProductId === product.vendorProductId ? Colors.primary : Colors.border, gap: Spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selectedProductId === product.vendorProductId ? Colors.primary : Colors.border, justifyContent: 'center', alignItems: 'center' }}>
                  {selectedProductId === product.vendorProductId && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>{product.localizedTitle}</Text>
                      {((product as any).subscriptionDetails?.introductoryOfferEligibility || (product as any).subscription?.offer) && (
                        <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>Free trial available</Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontFamily: Fonts.bold, fontSize: 18, color: Colors.text }}>{(product as any).localizedPrice || (product as any).price?.localizedString}</Text>
                      <Text style={{ fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary }}>/{(product as any).localizedSubscriptionPeriod || (product as any).subscription?.localizedPeriod}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top }}>
      {onClose && (
        <TouchableOpacity style={{ position: 'absolute', top: insets.top + Spacing.md, right: Spacing.xl, zIndex: 10 }} onPress={onClose}>
          <Ionicons name="close" size={28} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Fixed header — title with inline icon, subtitle */}
      <View style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.xxl }}>
        <Text style={{ fontFamily: Fonts.bold, fontSize: 26, color: Colors.text, textAlign: 'center' }}>
          <Ionicons name="diamond" size={28} color={Colors.primary} />
          {'  Unlock Slimsy Pro'}
        </Text>
        <Text style={{ fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
          Get the full experience with unlimited tracking, AI food analysis, and personalized insights
        </Text>
      </View>

      {/* Scrollable features list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.xxl, gap: Spacing.md, paddingBottom: Spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        {[
          { icon: 'camera-outline', text: 'AI Food Photo Analysis' },
          { icon: 'analytics-outline', text: 'Advanced Weight Charts' },
          { icon: 'notifications-outline', text: 'Smart Dose Reminders' },
          { icon: 'body-outline', text: 'Injection Site Tracker' },
          { icon: 'pulse-outline', text: 'GLP-1 Level Estimator' },
        ].map((f) => (
          <View key={f.text} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderCurve: 'continuous' }}>
              <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={20} color={Colors.primary} />
            </View>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 15, color: Colors.text }}>{f.text}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pinned bottom */}
      <View style={{ paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg, paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.sm, backgroundColor: Colors.background }}>
        
        {renderProducts()}

        <View style={{ marginTop: Spacing.xl }}>
          <PrimaryButton
            onPress={products.length > 0 ? handleSubscribe : onComplete}
            title={products.length > 0 ? (isPurchasing ? 'Processing...' : 'Start Free Trial') : 'Continue without subscription'}
            disabled={isPurchasing || (products.length > 0 && !selectedProductId)}
          />
        </View>

        {/* Footer links */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: Spacing.lg }}>
          <Pressable onPress={() => {}} hitSlop={10}>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textTertiary }}>Terms</Text>
          </Pressable>
          <Pressable onPress={() => {}} hitSlop={10}>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textTertiary }}>Privacy</Text>
          </Pressable>
          <Pressable onPress={handleRestorePurchases} hitSlop={10} disabled={isPurchasing}>
            <Text style={{ fontFamily: Fonts.medium, fontSize: 13, color: Colors.textTertiary }}>
              {isPurchasing ? '...' : 'Restore'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
