import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArbolAnimado } from '@/components/ArbolAnimado';
import { ConfetiHojas } from '@/components/ConfetiHojas';
import { CTAButton } from '@/components/CTAButton';
import { ShareCard, type ShareCardRef } from '@/components/ShareCard';
import { normalizeEngraving } from '@/lib/engraving';
import { shareCardImage } from '@/lib/shareCard';
import { usePets } from '@/store/pets';
import { colors, fonts, radius, spacing, type } from '@/theme';

// §7.7 — Sin NINGÚN dato sobre el estado del árbol (§9).
export default function GraciasScreen() {
  const params = useLocalSearchParams<{ petId?: string }>();
  const petId = params.petId ?? 'pet-toby';
  const pet = usePets((s) => s.pets.find((p) => p.id === petId));
  const engravingText = usePets((s) => s.refloresta[petId]?.engravingText);
  const cardRef = useRef<ShareCardRef>(null);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);

  if (!pet) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={type.h2}>¡Gracias! 💚</Text>
        <CTAButton title="Ir al inicio" variant="secondary" onPress={() => router.replace('/(tabs)/home')} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
      </SafeAreaView>
    );
  }

  const name = pet.name;
  const engraved = engravingText ?? normalizeEngraving(name);

  const onShare = async () => {
    setSharing(true);
    setShareNote(null);
    try {
      const outcome = await shareCardImage(cardRef, {
        dialogTitle: `${name} ha plantado un árbol 🌳`,
        message: `${name} ha plantado un árbol 🌳 con Barbiku y Refloresta. ¡Un regalo para el planeta que seguirá creciendo durante años! 💚`,
      });
      if (outcome === 'copied') setShareNote('Texto copiado. ¡Pégalo donde quieras compartirlo!');
      if (outcome === 'unavailable') setShareNote('No se puede compartir desde este dispositivo.');
    } catch {
      setShareNote('No se ha podido compartir. Inténtalo de nuevo.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={ZoomIn.duration(600)} style={styles.hero}>
          <View style={styles.heroGlow} />
          <ArbolAnimado name={name} grown size={210} />
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(200).duration(500)} style={styles.title} accessibilityRole="header">
          ¡Gracias! {name} acaba de hacer el mundo un poco más verde 💚
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(350).duration(500)} style={styles.body}>
          Gracias a ti, Refloresta plantará un árbol autóctono en honor a {name}. Es un regalo que seguirá creciendo
          durante años, mucho después de hoy.
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.impact}>
          <Text style={styles.impactText}>
            🌿 Tu árbol dará sombra y refugio a la fauna, protegerá el suelo y ayudará a recuperar nuestros bosques.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(650).duration(500)} style={styles.chapaCard}>
          <Text style={styles.chapaText}>
            🏷️ Tu chapa ecológica con <Text style={styles.bold}>{engraved}</Text> grabado ya está en camino. La
            recibirás en 7–10 días.
          </Text>
        </Animated.View>

        <Text style={styles.section} accessibilityRole="header">
          Compártelo
        </Text>
        <ShareCard ref={cardRef} petName={name} species={pet.species} />
        <CTAButton
          title="Compartir"
          variant="secondary"
          loading={sharing}
          onPress={onShare}
          accessibilityLabel={`Compartir la tarjeta ${name} ha plantado un árbol`}
          style={{ marginTop: spacing.md }}
        />
        {shareNote ? (
          <Text style={styles.note} accessibilityLiveRegion="polite">
            {shareNote}
          </Text>
        ) : null}

        <CTAButton
          title="Volver a mi mascota"
          accessibilityLabel={`Volver a la ficha de ${name}`}
          onPress={() => router.replace({ pathname: '/mascota/[id]', params: { id: petId } })}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
      <ConfetiHojas />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.crema },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  hero: { alignItems: 'center', justifyContent: 'center' },
  heroGlow: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#E3F3DA' },
  title: { ...type.h1, textAlign: 'center', color: colors.bosque, marginTop: spacing.sm },
  body: { ...type.body, fontSize: 17, lineHeight: 24, textAlign: 'center', marginTop: spacing.sm },
  impact: { marginTop: spacing.lg, backgroundColor: '#E3F3DA', borderRadius: radius.lg, padding: spacing.md },
  impactText: { ...type.body, color: colors.bosque, fontFamily: fonts.semibold },
  chapaCard: {
    marginTop: spacing.md,
    backgroundColor: colors.blanco,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  chapaText: { ...type.body },
  bold: { fontFamily: fonts.black, letterSpacing: 1 },
  section: { ...type.h2, fontSize: 19, marginTop: spacing.xl, marginBottom: spacing.sm },
  note: { ...type.small, textAlign: 'center', marginTop: spacing.sm },
});
