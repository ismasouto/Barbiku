import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@/theme';

export interface ChapaPreviewProps {
  /** Texto grabado. Se muestra en MAYÚSCULAS. */
  name: string;
  /** Diámetro de la chapa en px (≈120 por defecto). */
  size?: number;
  /** Balanceo suave + brillo que cruza la chapa. */
  animated?: boolean;
}

/**
 * Chapa ecológica de madera/corcho con anilla, nombre grabado y una hojita (§7.4, §11).
 * Puramente decorativa para la accesibilidad salvo su etiqueta.
 */
export function ChapaPreview({ name, size = 120, animated = true }: ChapaPreviewProps) {
  const reduceMotion = useReducedMotion();
  const sway = useSharedValue(0);
  const shine = useSharedValue(0);
  const animate = animated && !reduceMotion;

  useEffect(() => {
    if (!animate) {
      sway.value = 0;
      shine.value = 0;
      return;
    }
    sway.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    shine.value = withRepeat(
      withSequence(withTiming(0, { duration: 0 }), withDelay(1400, withTiming(1, { duration: 1100 }))),
      -1,
      false,
    );
  }, [animate, sway, shine]);

  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotateY: `${sway.value * 14}deg` }, { rotateZ: `${sway.value * 3}deg` }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value > 0 && shine.value < 1 ? 0.55 : 0,
    transform: [{ translateX: -size + shine.value * size * 2 }, { rotateZ: '20deg' }],
  }));

  const text = (name || ' ').toLocaleUpperCase('es-ES');
  // Ajuste del cuerpo de letra a la longitud (máx. 12 caracteres).
  const len = [...text].length;
  const fontSize = Math.round(size * (len <= 4 ? 0.22 : len <= 6 ? 0.18 : len <= 9 ? 0.14 : 0.115));
  const ringSize = size * 0.2;

  return (
    <View
      style={{ alignItems: 'center', width: size + 8, height: size + ringSize * 0.6 + 4 }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Vista previa de la chapa con el nombre ${text} grabado`}>
      <Animated.View style={[{ alignItems: 'center', transformOrigin: 'top' }, swayStyle]}>
        {/* Anilla metálica */}
        <View
          style={[
            styles.ring,
            { width: ringSize, height: ringSize, borderRadius: ringSize / 2, marginBottom: -ringSize * 0.4 },
          ]}
        />
        <View
          style={[
            styles.disc,
            { width: size, height: size, borderRadius: size / 2 },
          ]}>
          <LinearGradient
            colors={['#D8AE7E', '#C89B6D', '#A9784A', '#BE8F5E']}
            locations={[0, 0.35, 0.75, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Vetas de la madera */}
          {[0.22, 0.4, 0.62, 0.8].map((t, i) => (
            <View
              key={t}
              style={[
                styles.grain,
                {
                  top: size * t,
                  left: size * (i % 2 ? 0.08 : 0.14),
                  right: size * (i % 2 ? 0.16 : 0.06),
                  borderRadius: size,
                },
              ]}
            />
          ))}
          {/* Bisel interior */}
          <View style={[styles.bevel, { borderRadius: size / 2 }]} />
          {/* Agujero para la anilla */}
          <View style={[styles.hole, { top: size * 0.06, width: size * 0.09, height: size * 0.09, borderRadius: size }]} />

          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.engraved, { fontSize, maxWidth: size * 0.82 }]}>
            {text}
          </Text>
          <Text style={[styles.leaf, { fontSize: size * 0.13 }]} importantForAccessibility="no">
            🍃
          </Text>

          <Animated.View
            pointerEvents="none"
            style={[styles.shine, { width: size * 0.28, height: size * 1.6, top: -size * 0.3 }, shineStyle]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 3,
    borderColor: '#9AA3A0',
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  disc: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5A3A1E',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  grain: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(110, 70, 35, 0.18)',
  },
  bevel: {
    ...StyleSheet.absoluteFill,
    margin: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 235, 205, 0.35)',
  },
  hole: {
    position: 'absolute',
    backgroundColor: '#6E4A2B',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  engraved: {
    fontFamily: fonts.black,
    color: '#5C3A1C',
    letterSpacing: 1.5,
    textAlign: 'center',
    // Simula el grabado: luz por debajo, sombra por arriba.
    textShadowColor: 'rgba(255, 228, 190, 0.7)',
    textShadowOffset: { width: 0, height: 1.2 },
    textShadowRadius: 0.5,
  },
  leaf: {
    marginTop: 2,
  },
  shine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
