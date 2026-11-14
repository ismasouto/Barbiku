import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArbolAnimado } from '@/components/ArbolAnimado';
import { ChapaPreview } from '@/components/ChapaPreview';
import { CTAButton } from '@/components/CTAButton';
import { formatEuro, grossPrice, priceBreakdown } from '@/config/pricing';
import { formatThousands } from '@/lib/format';
import { getTreesFunded } from '@/lib/supabase';
import { usePets } from '@/store/pets';
import { colors, fonts, radius, spacing, type } from '@/theme';

export default function OfertaScreen() {
  const params = useLocalSearchParams<{ petId?: string }>();
  const petId = params.petId ?? 'pet-toby';
  const pet = usePets((s) => s.pets.find((p) => p.id === petId));
  const guardian = usePets((s) => s.refloresta[petId]?.guardian ?? false);
  const [treesFunded, setTreesFunded] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    getTreesFunded()
      .then((n) => alive && setTreesFunded(n))
      .catch(() => alive && setTreesFunded(null)); // sin conexión: se oculta el contador
    return () => {
      alive = false;
    };
  }, []);

  const close = () => {
    if (!guardian) usePets.getState().dismissOffer(petId);
    router.dismissTo('/(tabs)/home');
  };

  if (!pet) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={type.h2}>No encontramos esta mascota</Text>
        <CTAButton title="Volver" variant="secondary" onPress={() => router.dismissTo('/(tabs)/home')} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
      </SafeAreaView>
    );
  }

  const name = pet.name;

  const benefits = [
    { icon: '🌱', text: `Un árbol autóctono plantado en honor a ${name}` },
    { icon: '🏷️', text: 'Chapa para collar de materiales ecológicos con su nombre grabado' },
    { icon: '💚', text: 'El 100 % de los 20 € va a Refloresta' },
    { icon: '📸', text: `Tarjeta "${name} ha plantado un árbol" para compartir` },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
      <Pressable
        onPress={close}
        style={styles.closeX}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={guardian ? 'Cerrar' : 'Ahora no, cerrar la oferta'}>
        <Text style={styles.closeXText}>✕</Text>
      </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <ArbolAnimado name={name} size={200} />
        </View>

        <Animated.Text entering={FadeInDown.delay(150).duration(500)} style={styles.title} accessibilityRole="header">
          {name} merece dejar huella en el planeta 🌳
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(300).duration(500)} style={styles.subtitle}>
          Planta hoy un árbol autóctono en su honor con Refloresta. Solo una vez, para siempre.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(450).duration(500)} style={styles.offerTag}>
          <Text style={styles.offerTagText}>
            🎁 EXCLUSIVO AL DAR DE ALTA · Chapa ecológica grabada con su nombre GRATIS
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.chapaBox}>
          <ChapaPreview name={name} size={124} />
          <Text style={styles.chapaCaption}>Así quedará la chapa de {name}</Text>
        </Animated.View>

        <View style={styles.benefits}>
          {benefits.map((b) => (
            <View key={b.icon} style={styles.benefitRow}>
              <Text style={styles.benefitIcon} importantForAccessibility="no">
                {b.icon}
              </Text>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {treesFunded !== null ? (
          <View style={styles.social}>
            <Text style={styles.socialText}>
              🌍 Ya se han plantado <Text style={styles.socialNum}>{formatThousands(treesFunded)}</Text> árboles por
              mascotas Barbiku
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Pie fijo: precio + CTA + "Ahora no" siempre visibles */}
      <View style={styles.footer}>
        <Text style={styles.price}>
          <Text style={styles.priceBig}>{formatEuro(grossPrice())}</Text> · pago único
        </Text>
        <Text style={styles.breakdown}>{priceBreakdown()}</Text>
        {guardian ? (
          <CTAButton title={`${name} ya tiene su árbol 💚`} disabled style={styles.cta} />
        ) : (
          <CTAButton
            title={`🌳 Plantar el árbol de ${name}`}
            accessibilityLabel={`Plantar el árbol de ${name} por ${formatEuro(grossPrice())}`}
            pulse
            onPress={() => router.push({ pathname: '/refloresta/envio', params: { petId } })}
            style={styles.cta}
          />
        )}
        <CTAButton title={guardian ? 'Volver' : 'Ahora no'} variant="ghost" onPress={close} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.crema },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  closeX: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borde,
  },
  closeXText: { fontSize: 18, color: colors.textoSuave, fontFamily: fonts.bold },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  hero: { alignItems: 'center', justifyContent: 'center', paddingTop: spacing.md },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#E3F3DA',
  },
  title: { ...type.h1, fontSize: 32, lineHeight: 38, textAlign: 'center', color: colors.bosque, marginTop: spacing.sm },
  subtitle: { ...type.body, fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: spacing.sm, color: colors.texto },
  offerTag: {
    marginTop: spacing.md,
    backgroundColor: colors.acento,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    shadowColor: colors.acento,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  // Texto oscuro sobre naranja para contraste AA.
  offerTagText: { fontFamily: fonts.black, fontSize: 14, lineHeight: 19, color: '#2B1206', textAlign: 'center', letterSpacing: 0.3 },
  chapaBox: { alignItems: 'center', marginTop: spacing.lg },
  chapaCaption: { ...type.small, marginTop: spacing.sm },
  benefits: {
    marginTop: spacing.lg,
    backgroundColor: colors.blanco,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm + 2 },
  benefitIcon: { fontSize: 20, lineHeight: 24, width: 26, textAlign: 'center' },
  benefitText: { ...type.body, flex: 1, fontFamily: fonts.semibold },
  social: {
    marginTop: spacing.md,
    backgroundColor: '#E3F3DA',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  socialText: { ...type.body, textAlign: 'center', color: colors.bosque, fontFamily: fonts.semibold },
  socialNum: { fontFamily: fonts.black },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xs,
    backgroundColor: colors.crema,
    borderTopWidth: 1,
    borderTopColor: colors.borde,
  },
  price: { ...type.body, textAlign: 'center', fontFamily: fonts.bold },
  priceBig: { fontFamily: fonts.black, fontSize: 22, color: colors.texto },
  breakdown: { ...type.small, textAlign: 'center', marginTop: 2 },
  cta: { marginTop: spacing.sm + 2 },
});
