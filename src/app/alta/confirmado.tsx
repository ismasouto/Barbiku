import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { planName } from '@/components/seguro/ui';
import { usePets } from '@/store/pets';
import { colors, fonts, spacing, type } from '@/theme';

const OFFER_DELAY_MS = 1500;

// Póliza creada (§7.3) → abre la oferta de Refloresta a los ~1,5 s.
export default function ConfirmadoScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const pet = usePets((s) => s.pets.find((p) => p.id === petId));
  const policy = usePets((s) => s.policies.find((p) => p.petId === petId));

  const check = useSharedValue(0);
  const ring = useSharedValue(0);
  const text = useSharedValue(0);

  useEffect(() => {
    if (!pet) return;
    check.value = withSpring(1, { damping: 9, stiffness: 140 });
    ring.value = withSequence(
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 300 }),
    );
    text.value = withDelay(250, withTiming(1, { duration: 450 }));
    const t = setTimeout(() => {
      router.replace({ pathname: '/refloresta/oferta', params: { petId: pet.id } });
    }, OFFER_DELAY_MS);
    return () => clearTimeout(t);
  }, [pet, check, ring, text]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.value }, { rotate: `${(1 - check.value) * -45}deg` }],
    opacity: check.value,
  }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.8 + ring.value * 0.8 }],
    opacity: ring.value * 0.5,
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 16 }],
  }));

  if (!pet) return <Redirect href="/(tabs)/home" />;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.check, checkStyle]}>
          <Text style={styles.checkText}>✓</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.texts, textStyle]} accessible accessibilityLiveRegion="polite">
        <Text style={styles.title}>✅ {pet.name} ya está protegida</Text>
        {policy && (
          <Text style={[type.body, styles.subtitle]}>
            Póliza {planName(policy.planId)} activa desde hoy.
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const SIZE = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.crema,
    padding: spacing.lg,
  },
  iconWrap: { width: SIZE * 1.6, height: SIZE * 1.6, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.brote,
  },
  check: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.bosque,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 10px 24px rgba(31, 111, 67, 0.35)',
  },
  checkText: { fontFamily: fonts.black, fontSize: 64, color: colors.blanco, lineHeight: 74 },
  texts: { alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  title: { ...type.h1, textAlign: 'center' },
  subtitle: { color: colors.textoSuave, textAlign: 'center' },
});
