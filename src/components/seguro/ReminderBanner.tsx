import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePets } from '@/store/pets';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Pet } from '@/types';

/** Banner de recuerdo (§7.4): 7 días tras "Ahora no"; la X lo cierra para siempre. */
export function ReminderBanner({ pet }: { pet: Pet }) {
  const closeBanner = usePets((s) => s.closeBanner);
  return (
    <View style={styles.banner}>
      <Pressable
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.8 }]}
        onPress={() => router.push({ pathname: '/refloresta/oferta', params: { petId: pet.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${pet.name} aún no tiene su árbol. ¿Lo plantamos?`}>
        <Text style={styles.emoji}>🌱</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{pet.name} aún no tiene su árbol. ¿Lo plantamos?</Text>
          <Text style={styles.link}>Ver la oferta →</Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => closeBanner(pet.id)}
        hitSlop={12}
        style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
        accessibilityLabel={`Cerrar recordatorio del árbol de ${pet.name}`}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F4E2',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.brote,
    paddingLeft: spacing.md,
    paddingVertical: spacing.md,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emoji: { fontSize: 32 },
  title: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.bosque },
  link: { fontFamily: fonts.semibold, fontSize: 14, color: colors.bosque, marginTop: 4, opacity: 0.85 },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing.sm,
  },
  closeText: { fontSize: 18, color: colors.bosque, fontFamily: fonts.bold },
});
