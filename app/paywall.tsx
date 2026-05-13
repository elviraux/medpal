import React from 'react';
import { useRouter } from 'expo-router';
import { Paywall } from '@/components/Paywall';

export default function PaywallScreen() {
  const router = useRouter();
  return (
    <Paywall 
      onComplete={() => router.back()} 
      onClose={() => router.back()} 
    />
  );
}
