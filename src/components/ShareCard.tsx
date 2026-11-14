import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ArbolAnimado } from '@/components/ArbolAnimado';
import { BarbikuLogo, ReflorestaLogo } from '@/components/Logos';
import { colors, fonts, radius, spacing } from '@/theme';
import type { Species } from '@/types';

export type ShareCardRef = ComponentRef<typeof View>;

export interface ShareCardProps {
  petName: string;
  species: Species;
  /** Ref al View raíz, para capturarlo con react-native-view-shot. */
  ref?: Ref<ShareCardRef>;
}

/** Tarjeta "X ha plantado un árbol" para compartir (§7.7). Sin ningún dato del estado del árbol. */
export function ShareCard({ petName, species, ref }: ShareCardProps) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <LinearGradient
        colors={['#FFF8EC', '#E7F5DF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.avatar} accessible accessibilityLabel={`Avatar de ${petName}`}>
        <Text style={styles.avatarEmoji}>{species === 'gato' ? '🐱' : '🐶'}</Text>
      </View>
      <Text style={styles.title}>{petName} ha plantado un árbol 🌳</Text>
      <Text style={styles.subtitle}>Un regalo para el planeta que seguirá creciendo durante años</Text>
      <View style={styles.tree}>
        <ArbolAnimado name={petName} grown size={150} />
      </View>
      <View style={styles.logos}>
        <BarbikuLogo size={14} />
        <Text style={styles.times}>×</Text>
        <ReflorestaLogo size={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borde,
    backgroundColor: colors.crema,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.blanco,
    borderWidth: 3,
    borderColor: colors.brote,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarEmoji: { fontSize: 38 },
  title: { fontFamily: fonts.black, fontSize: 22, lineHeight: 28, color: colors.bosque, textAlign: 'center' },
  subtitle: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.textoSuave,
    textAlign: 'center',
    marginTop: 4,
  },
  tree: { marginTop: spacing.sm },
  logos: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  times: { fontFamily: fonts.bold, color: colors.textoSuave },
});
