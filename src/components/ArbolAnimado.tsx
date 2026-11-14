import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts } from '@/theme';

export interface ArbolAnimadoProps {
  /** Nombre de la mascota para la placa del árbol (se muestra en MAYÚSCULAS). Opcional. */
  name?: string;
  /** true = aparece ya crecido (sin animación de crecimiento). */
  grown?: boolean;
  /** Ancho del dibujo en px. */
  size?: number;
  /** Retraso antes de empezar a crecer (ms). */
  delay?: number;
}

const CANOPY = [
  // [cx, cy, r] relativos al tamaño; tonos alternos
  { x: 0.5, y: 0.3, r: 0.25, c: colors.bosque, d: 0 },
  { x: 0.3, y: 0.42, r: 0.2, c: '#2E8B57', d: 0.05 },
  { x: 0.7, y: 0.42, r: 0.2, c: '#2E8B57', d: 0.1 },
  { x: 0.4, y: 0.22, r: 0.17, c: colors.brote, d: 0.15 },
  { x: 0.62, y: 0.25, r: 0.16, c: '#5DB85A', d: 0.2 },
];

/** Brote que crece hasta árbol, con placa opcional con el nombre (§7.4, §7.7). Solo decorativo. */
export function ArbolAnimado({ name, grown = false, size = 220, delay = 200 }: ArbolAnimadoProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(grown || reduceMotion ? 1 : 0);
  const breeze = useSharedValue(0);

  useEffect(() => {
    if (grown || reduceMotion) {
      progress.value = 1;
    } else {
      progress.value = 0;
      progress.value = withDelay(delay, withTiming(1, { duration: 2600, easing: Easing.out(Easing.cubic) }));
    }
    if (!reduceMotion) {
      breeze.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      );
    }
  }, [grown, reduceMotion, delay, progress, breeze]);

  const h = size * 1.05;
  const trunkH = size * 0.38;
  const trunkW = size * 0.1;
  const groundY = h * 0.86;

  const sproutStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 0.38, 0.5], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 0.25], [0.2, 1], Extrapolation.CLAMP) }],
  }));

  const trunkStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(progress.value, [0.25, 0.6], [0, 1], Extrapolation.CLAMP) }],
  }));

  const canopyWrapStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${breeze.value * 1.6 * progress.value}deg` }],
  }));

  const plaqueStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.8, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0.8, 1], [10, 0], Extrapolation.CLAMP) }],
  }));

  const label = name ? name.toLocaleUpperCase('es-ES') : undefined;

  return (
    <View
      style={{ width: size, height: h }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label ? `Ilustración de un árbol con una placa con el nombre ${label}` : 'Ilustración de un árbol'}>
      {/* Suelo */}
      <View
        style={[
          styles.ground,
          { width: size * 0.8, height: size * 0.12, left: size * 0.1, top: groundY - size * 0.04, borderRadius: size },
        ]}
      />

      {/* Brote */}
      <Animated.View
        style={[
          styles.sprout,
          { left: size / 2 - size * 0.09, top: groundY - size * 0.16, width: size * 0.18, height: size * 0.16, transformOrigin: 'bottom' },
          sproutStyle,
        ]}>
        <View style={[styles.sproutStem, { height: size * 0.1, left: size * 0.085 }]} />
        <View style={[styles.leafL, { width: size * 0.09, height: size * 0.055, top: 0, left: 0 }]} />
        <View style={[styles.leafR, { width: size * 0.09, height: size * 0.055, top: size * 0.02, right: 0 }]} />
      </Animated.View>

      {/* Tronco */}
      <Animated.View
        style={[
          styles.trunk,
          {
            width: trunkW,
            height: trunkH,
            left: size / 2 - trunkW / 2,
            top: groundY - trunkH,
            borderRadius: trunkW / 3,
            transformOrigin: 'bottom',
          },
          trunkStyle,
        ]}
      />

      {/* Copa */}
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: `50% ${groundY}px` }, canopyWrapStyle]}>
        {CANOPY.map((b, i) => (
          <CanopyBlob key={i} progress={progress} size={size} blob={b} />
        ))}
      </Animated.View>

      {/* Placa con el nombre */}
      {label ? (
        <Animated.View
          style={[styles.plaque, { top: groundY - size * 0.17, alignSelf: 'center', maxWidth: size * 0.7 }, plaqueStyle]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.plaqueText, { fontSize: Math.max(11, size * 0.065) }]}>
            {label}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

function CanopyBlob({
  progress,
  size,
  blob,
}: {
  progress: { value: number };
  size: number;
  blob: (typeof CANOPY)[number];
}) {
  const style = useAnimatedStyle(() => {
    const start = 0.5 + blob.d;
    return {
      opacity: interpolate(progress.value, [start, start + 0.1], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(progress.value, [start, start + 0.3], [0, 1], Extrapolation.CLAMP) }],
    };
  });
  const d = blob.r * 2 * size;
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: d,
          height: d,
          borderRadius: d / 2,
          left: blob.x * size - d / 2,
          top: blob.y * size - d / 2 + size * 0.06,
          backgroundColor: blob.c,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ground: { position: 'absolute', backgroundColor: '#C9A27A' },
  sprout: { position: 'absolute' },
  sproutStem: { position: 'absolute', bottom: 0, width: 3, backgroundColor: '#4E9A44', borderRadius: 2 },
  leafL: {
    position: 'absolute',
    backgroundColor: colors.brote,
    borderTopLeftRadius: 40,
    borderBottomRightRadius: 40,
    transform: [{ rotateZ: '-20deg' }],
  },
  leafR: {
    position: 'absolute',
    backgroundColor: colors.brote,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 40,
    transform: [{ rotateZ: '20deg' }],
  },
  trunk: { position: 'absolute', backgroundColor: colors.tierra },
  plaque: {
    position: 'absolute',
    backgroundColor: '#E4C79F',
    borderColor: '#8B5E3C',
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  plaqueText: { fontFamily: fonts.black, color: '#5C3A1C', letterSpacing: 1.2 },
});
