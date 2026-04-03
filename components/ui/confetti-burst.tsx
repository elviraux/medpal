import React, { useEffect, useMemo } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const CONFETTI_COLORS = [
  '#1A6FD4',
  '#00B4A6',
  '#F0A030',
  '#E5534B',
  '#9B59B6',
  '#FF6B9D',
  '#2ECC71',
  '#F39C12',
  '#3498DB',
  '#E74C3C',
];

const PARTICLE_COUNT = 50;
const BURST_DURATION = 2800;

interface ParticleConfig {
  id: number;
  color: string;
  startX: number;
  width: number;
  height: number;
  borderRadius: number;
  burstHeight: number;
  finalX: number;
  rotation: number;
  delay: number;
  wobbleAmplitude: number;
  wobbleFrequency: number;
}

function ConfettiParticle({
  config,
  screenHeight,
}: {
  config: ParticleConfig;
  screenHeight: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, {
        duration: BURST_DURATION - config.delay,
        easing: Easing.linear,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire-once animation on mount; config and progress are stable refs
  }, []);

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const t = progress.value;

    // Y motion: burst upward first 12%, then fall with gravity
    let y: number;
    if (t < 0.12) {
      const p = t / 0.12;
      y = -config.burstHeight * (1 - (1 - p) * (1 - p));
    } else {
      const p = (t - 0.12) / 0.88;
      y =
        -config.burstHeight +
        (screenHeight + config.burstHeight + 80) * p * p;
    }

    // X motion: spread outward + flutter wobble that fades over time
    const x =
      config.finalX * t +
      Math.sin(t * Math.PI * config.wobbleFrequency) *
        (1 - t) *
        config.wobbleAmplitude;

    const rot = config.rotation * t;

    // Fully visible until 65%, then fade out
    const opacity = t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / 0.35);

    return {
      transform: [
        { translateY: y },
        { translateX: x },
        { rotate: `${rot}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.startX,
          top: 0,
          width: config.width,
          height: config.height,
          backgroundColor: config.color,
          borderRadius: config.borderRadius,
        },
        animStyle,
      ]}
    />
  );
}

interface ConfettiBurstProps {
  onComplete?: () => void;
}

export function ConfettiBurst({ onComplete }: ConfettiBurstProps) {
  const { width, height } = useWindowDimensions();

  const particles = useMemo((): ParticleConfig[] => {
    const centerX = width / 2;
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const isRect = Math.random() > 0.35;
      const w = isRect ? 4 + Math.random() * 5 : 6 + Math.random() * 8;
      const h = isRect ? w * (1.8 + Math.random() * 2.2) : w;
      const br = isRect ? 1.5 : w / 2;

      return {
        id: i,
        color:
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        startX: centerX + (Math.random() - 0.5) * 80,
        width: w,
        height: h,
        borderRadius: br,
        burstHeight: 100 + Math.random() * 250,
        finalX: (Math.random() - 0.5) * width * 0.95,
        rotation: 360 + Math.random() * 1080,
        delay: Math.random() * 280,
        wobbleAmplitude: 8 + Math.random() * 18,
        wobbleFrequency: 3 + Math.random() * 4,
      };
    });
  }, [width]);

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, BURST_DURATION + 400);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
        overflow: 'hidden',
      }}
    >
      {particles.map((p) => (
        <ConfettiParticle key={p.id} config={p} screenHeight={height} />
      ))}
    </View>
  );
}
