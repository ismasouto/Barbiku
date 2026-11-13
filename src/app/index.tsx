import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarbikuLogo } from '@/components/seguro/Logo';
import { Button, confirmAction, useStoresHydrated } from '@/components/seguro/ui';
import { MOCK_USER } from '@/data/mock';
import { configureRC } from '@/lib/revenuecat';
import { resetDemo, useUser } from '@/store/user';
import { colors, fonts, radius, spacing, type } from '@/theme';

const ADMIN_TAPS = 5;
const TAP_WINDOW_MS = 2000;

// Login falso (§7.1): no hay autenticación real.
export default function LoginScreen() {
  const hydrated = useStoresHydrated();
  const loggedIn = useUser((s) => s.loggedIn);
  const appUserId = useUser((s) => s.appUserId);
  const login = useUser((s) => s.login);

  const [email, setEmail] = useState(MOCK_USER.email);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const taps = useRef<number[]>([]);
  const remembered = hydrated && loggedIn && !!appUserId && !loading;

  useEffect(() => {
    // Sesión recordada: RevenueCat se configura igualmente al volver a abrir la app.
    if (remembered && appUserId) configureRC(appUserId).catch(() => {});
  }, [remembered, appUserId]);

  if (!hydrated) return <View style={styles.flex} />;

  if (remembered) return <Redirect href="/(tabs)/home" />;

  const onLogoPress = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.current.length >= ADMIN_TAPS) {
      taps.current = [];
      router.push('/admin');
    }
  };

  const onLogoLongPress = async () => {
    taps.current = [];
    const ok = await confirmAction(
      'Reiniciar demo',
      'Se borrarán todos los datos guardados en este dispositivo y se creará un usuario nuevo.',
      'Reiniciar',
    );
    if (!ok) return;
    await resetDemo();
    setEmail(MOCK_USER.email);
    setNotice('Demo reiniciada. Usuario nuevo listo.');
  };

  const onLogin = async () => {
    setLoading(true);
    const id = login(email);
    try {
      await configureRC(id);
    } catch {
      // El seguro funciona sin RevenueCat; la compra se reintentará más tarde.
    }
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={onLogoPress}
            onLongPress={onLogoLongPress}
            delayLongPress={800}
            accessibilityRole="image"
            accessibilityLabel="Logo de Barbiku"
            accessibilityHint="Mantén pulsado para reiniciar la demo">
            <BarbikuLogo size={104} />
          </Pressable>

          <Text style={styles.tagline}>El seguro de salud que tu mascota se merece</Text>

          <View style={styles.form}>
            <Text style={styles.label} nativeID="email-label">
              Correo electrónico
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.textoSuave}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={onLogin}
              accessibilityLabel="Correo electrónico"
              accessibilityLabelledBy="email-label"
            />
            <Button label="Entrar" onPress={onLogin} loading={loading} style={{ marginTop: spacing.md }} />
            <Text style={styles.hint}>Demo: no hace falta contraseña.</Text>
            {notice && (
              <Text style={styles.notice} accessibilityLiveRegion="polite">
                {notice}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.crema },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  tagline: { ...type.body, color: colors.textoSuave, textAlign: 'center', marginBottom: spacing.lg },
  form: { width: '100%', maxWidth: 420 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.texto, marginBottom: 6 },
  input: {
    minHeight: 52,
    backgroundColor: colors.blanco,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borde,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.texto,
  },
  hint: { ...type.small, textAlign: 'center', marginTop: spacing.md },
  notice: {
    marginTop: spacing.sm,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    color: colors.bosque,
  },
});
