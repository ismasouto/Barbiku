import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/theme';

/** Logo ficticio de Barbiku: escudo redondo con huella + nombre. Sin marcas reales. */
export function BarbikuLogo({ size = 96, showName = true }: { size?: number; showName?: boolean }) {
  return (
    <View style={styles.wrap} accessible accessibilityLabel="Barbiku, seguros para mascotas">
      <View
        style={[
          styles.shield,
          { width: size, height: size, borderRadius: size * 0.36 },
        ]}>
        <Text style={[styles.letter, { fontSize: size * 0.62, lineHeight: size * 0.72 }]}>b</Text>
        <Text style={[styles.paw, { fontSize: size * 0.16, top: size * 0.12, right: size * 0.16 }]}>🐾</Text>
        <View style={[styles.leaf, { width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]}>
          <Text style={{ fontSize: size * 0.17 }}>💚</Text>
        </View>
      </View>
      {showName && (
        <Text style={[styles.name, { fontSize: size * 0.4 }]}>
          barbi<Text style={{ color: colors.brote }}>ku</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  shield: {
    backgroundColor: colors.bosque,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    boxShadow: '0px 8px 20px rgba(31, 111, 67, 0.3)',
  },
  letter: { fontFamily: fonts.black, color: colors.crema },
  paw: { position: 'absolute', opacity: 0.9 },
  leaf: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    backgroundColor: colors.crema,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bosque,
  },
  name: { fontFamily: fonts.black, color: colors.bosque, marginTop: 14, letterSpacing: 0.5 },
});
