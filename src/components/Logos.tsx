import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

/** Logotipos FICTICIOS (marcas inventadas para la demo). */
export function BarbikuLogo({ size = 16, color = colors.bosque }: { size?: number; color?: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel="Barbiku">
      <View style={[styles.badge, { width: size * 1.5, height: size * 1.5, borderRadius: size, backgroundColor: color }]}>
        <Text style={{ fontSize: size * 0.85 }}>🐾</Text>
      </View>
      <Text style={[styles.word, { fontSize: size, color }]}>Barbiku</Text>
    </View>
  );
}

export function ReflorestaLogo({ size = 16, color = colors.bosque }: { size?: number; color?: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel="Refloresta">
      <View
        style={[
          styles.badge,
          { width: size * 1.5, height: size * 1.5, borderRadius: size * 0.4, backgroundColor: colors.brote },
        ]}>
        <Text style={{ fontSize: size * 0.85 }}>🌿</Text>
      </View>
      <Text style={[styles.word, { fontSize: size, color }]}>Refloresta</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.black, letterSpacing: 0.3 },
});
