import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, spacing } from '@/theme';
import type { ChapaStatus } from '@/types';

const STEPS: { key: ChapaStatus; label: string; icon: string }[] = [
  { key: 'recibido', label: 'Recibido', icon: '📥' },
  { key: 'grabando', label: 'Grabando', icon: '✍️' },
  { key: 'enviado', label: 'Enviado', icon: '📦' },
];

/** Estado de la chapa (lo único con estado visible para el cliente, §7.8). */
export function ChapaStepper({ status }: { status: ChapaStatus }) {
  const current = STEPS.findIndex((s) => s.key === status);
  const currentLabel = STEPS[current]?.label ?? 'Recibido';
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Estado de la chapa: ${currentLabel}, paso ${current + 1} de ${STEPS.length}`}>
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <View key={step.key} style={styles.step}>
            {i > 0 && <View style={[styles.line, i <= current && styles.lineDone]} />}
            <View style={[styles.dot, done && styles.dotDone, i === current && styles.dotCurrent]}>
              <Text style={styles.icon}>{done ? step.icon : '•'}</Text>
            </View>
            <Text style={[styles.label, done && styles.labelDone]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 40;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: spacing.md },
  step: { flex: 1, alignItems: 'center' },
  line: {
    position: 'absolute',
    top: DOT / 2 - 2,
    right: '50%',
    width: '100%',
    height: 4,
    backgroundColor: colors.borde,
  },
  lineDone: { backgroundColor: colors.brote },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: '#E6F4E2', borderWidth: 2, borderColor: colors.brote },
  dotCurrent: { borderColor: colors.bosque, borderWidth: 3 },
  icon: { fontSize: 18, color: colors.textoSuave },
  label: { marginTop: 6, fontFamily: fonts.semibold, fontSize: 13, color: colors.textoSuave },
  labelDone: { color: colors.bosque, fontFamily: fonts.bold },
});
