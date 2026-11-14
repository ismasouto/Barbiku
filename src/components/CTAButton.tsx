import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, fonts, radius, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface CTAButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  /** Pulso sutil para el CTA principal. Se desactiva con "reducir movimiento" y si está deshabilitado. */
  pulse?: boolean;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Botón de ancho completo con microanimación al pulsar (§11). */
export function CTAButton({
  title,
  onPress,
  variant = 'primary',
  pulse = false,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: CTAButtonProps) {
  const reduceMotion = useReducedMotion();
  const pulseScale = useSharedValue(1);
  const pressScale = useSharedValue(1);
  const shouldPulse = pulse && !disabled && !loading && !reduceMotion;

  useEffect(() => {
    if (shouldPulse) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.035, { duration: 750 }), withTiming(1, { duration: 750 })),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulseScale);
      pulseScale.value = withTiming(1, { duration: 150 });
    }
    return () => cancelAnimation(pulseScale);
  }, [shouldPulse, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * pressScale.value }],
  }));

  const inactive = disabled || loading;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        disabled={inactive}
        onPressIn={() => {
          pressScale.value = withTiming(0.97, { duration: 90 });
        }}
        onPressOut={() => {
          pressScale.value = withTiming(1, { duration: 140 });
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          disabled && variant === 'primary' && styles.primaryDisabled,
          pressed && variant !== 'primary' && { opacity: 0.7 },
        ]}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.blanco : colors.bosque} />
        ) : (
          <Text
            style={[
              styles.text,
              variant !== 'primary' && styles.textAlt,
              variant === 'ghost' && styles.textGhost,
              disabled && variant === 'primary' && styles.textDisabled,
            ]}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.bosque,
    shadowColor: colors.bosque,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  primaryDisabled: {
    backgroundColor: '#DCEBDD',
    shadowOpacity: 0,
    elevation: 0,
  },
  secondary: {
    backgroundColor: colors.blanco,
    borderWidth: 2,
    borderColor: colors.bosque,
  },
  ghost: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  text: { fontFamily: fonts.black, fontSize: 18, color: colors.blanco, textAlign: 'center' },
  textAlt: { color: colors.bosque, fontFamily: fonts.bold },
  textGhost: { color: colors.textoSuave, fontSize: 16, textDecorationLine: 'underline' },
  textDisabled: { color: colors.bosque },
});
