import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors } from '@/theme';

const LEAF_COLORS = [colors.bosque, colors.brote, '#4E9A44', '#A8D88F', '#C9A227'];

interface Leaf {
  x: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
}

/**
 * Lluvia de hojas que cae una vez al montar (§7.7). No bloquea toques (pointerEvents="none")
 * y no se muestra con "reducir movimiento".
 */
export function ConfetiHojas({ count = 28 }: { count?: number }) {
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();

  const leaves = useMemo<Leaf[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: Math.random(),
        size: 12 + Math.random() * 14,
        color: LEAF_COLORS[i % LEAF_COLORS.length],
        delay: Math.random() * 900,
        duration: 2600 + Math.random() * 1800,
        drift: (Math.random() - 0.5) * 120,
        spin: (Math.random() - 0.5) * 720,
      })),
    [count],
  );

  if (reduceMotion) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} importantForAccessibility="no-hide-descendants">
      {leaves.map((leaf, i) => (
        <FallingLeaf key={i} leaf={leaf} width={width} height={height} />
      ))}
    </View>
  );
}

function FallingLeaf({ leaf, width, height }: { leaf: Leaf; width: number; height: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(leaf.delay, withTiming(1, { duration: leaf.duration, easing: Easing.in(Easing.quad) }));
  }, [leaf, t]);
  const style = useLeafStyle(t, leaf, width, height);
  return (
    <Animated.View
      style={[
        styles.leaf,
        { width: leaf.size, height: leaf.size * 0.6, backgroundColor: leaf.color },
        style,
      ]}
    />
  );
}

function useLeafStyle(t: SharedValue<number>, leaf: Leaf, width: number, height: number) {
  return useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : t.value > 0.85 ? (1 - t.value) / 0.15 : 1,
    transform: [
      { translateX: leaf.x * width + Math.sin(t.value * Math.PI * 3) * 24 + leaf.drift * t.value },
      { translateY: -40 + t.value * (height + 80) },
      { rotateZ: `${leaf.spin * t.value}deg` },
    ],
  }));
}

const styles = StyleSheet.create({
  leaf: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderTopLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
});
