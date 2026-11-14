import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { PLANS } from '@/data/mock';
import { usePets } from '@/store/pets';
import { useUser } from '@/store/user';
import { colors, fonts, radius, spacing, type } from '@/theme';
import type { PlanId, Species } from '@/types';

/** True cuando los stores persistidos (usuario y mascotas) ya se han leído de AsyncStorage. */
export function useStoresHydrated(): boolean {
  const read = () => useUser.persist.hasHydrated() && usePets.persist.hasHydrated();
  const [hydrated, setHydrated] = useState(read);
  useEffect(() => {
    const check = () => setHydrated(read());
    const off1 = useUser.persist.onFinishHydration(check);
    const off2 = usePets.persist.onFinishHydration(check);
    check();
    return () => {
      off1();
      off2();
    };
  }, []);
  return hydrated;
}

/** Confirmación que funciona también en web (Alert.alert con botones no hace nada en web). */
export function confirmAction(title: string, message: string, confirmText: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export const speciesEmoji = (s: Species) => (s === 'perro' ? '🐶' : '🐱');
export const planName = (id: PlanId) => PLANS.find((p) => p.id === id)?.name ?? id;
export const formatEuros = (n: number) =>
  `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/** yyyy-mm-dd (fecha) o ISO con hora (se muestra en hora local) → dd/mm/aaaa */
export function formatDate(iso: string): string {
  if (iso.length > 10) {
    const dt = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  }
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ageLabel(birthIso: string): string {
  const b = new Date(birthIso);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  if (months < 1) return 'Menos de 1 mes';
  if (months < 12) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? 'año' : 'años'}`;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'ghost' && styles.btnGhost,
        inactive && styles.btnDisabled,
        pressed && !inactive && styles.btnPressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.blanco : colors.bosque} />
      ) : (
        <Text
          style={[
            type.button,
            variant !== 'primary' && { color: colors.bosque },
            variant === 'ghost' && { fontFamily: fonts.semibold, fontSize: 15 },
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function GuardianBadge({ compact }: { compact?: boolean }) {
  return (
    <View
      style={[styles.badge, compact && styles.badgeCompact]}
      accessibilityLabel="Insignia Guardiana del Bosque">
      <Text style={[styles.badgeText, compact && { fontSize: 12 }]}>🌳 Guardiana del Bosque</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 54,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.bosque },
  btnSecondary: { backgroundColor: colors.blanco, borderWidth: 2, borderColor: colors.bosque },
  btnGhost: { backgroundColor: 'transparent', minHeight: 44 },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { transform: [{ scale: 0.97 }], opacity: 0.9 },
  card: {
    backgroundColor: colors.blanco,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borde,
    boxShadow: '0px 4px 14px rgba(31, 111, 67, 0.08)',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E6F4E2',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.brote,
  },
  badgeCompact: { paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.bosque },
});
