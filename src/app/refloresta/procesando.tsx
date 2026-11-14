// §7.6 — Espera del entitlement tras volver de Stripe (por cierre del navegador o deep link
// barbiku://refloresta/procesando). La app solo LEE el entitlement; el pedido lo marca
// como pagado el webhook. Nunca se muestra información sobre el estado del árbol (§9).
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArbolAnimado } from '@/components/ArbolAnimado';
import { env } from '@/config/env';
import { hasRefloresta } from '@/lib/revenuecat';
import { devMarkOrderPaid } from '@/lib/supabase';
import { usePets } from '@/store/pets';
import { useUser } from '@/store/user';
import { colors, fonts, radius, spacing, type } from '@/theme';

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

type Phase = 'checking' | 'timeout';

/** Espera a que los stores persistidos se hayan rehidratado (importante al entrar por deep link en frío). */
function useStoresHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => usePets.persist.hasHydrated() && useUser.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    const check = () => {
      if (usePets.persist.hasHydrated() && useUser.persist.hasHydrated()) setHydrated(true);
    };
    const unsubs = [usePets.persist.onFinishHydration(check), useUser.persist.onFinishHydration(check)];
    check();
    return () => unsubs.forEach((u) => u());
  }, [hydrated]);
  return hydrated;
}

/**
 * petId de la URL o, si llega sin él (la success page de RevenueCat no lo conserva),
 * la mascota más reciente con pedido creado y aún sin insignia.
 */
function resolvePetId(param: string | undefined): string | undefined {
  if (param) return param;
  const { pets, refloresta } = usePets.getState();
  return [...pets]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((p) => refloresta[p.id]?.orderId && !refloresta[p.id]?.guardian)?.id;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ProcesandoScreen() {
  const params = useLocalSearchParams<{ petId?: string }>();
  const hydrated = useStoresHydrated();
  const [phase, setPhase] = useState<Phase>('checking');
  const [offline, setOffline] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cancelled = useRef(false);

  const petId = hydrated ? resolvePetId(params.petId) : undefined;
  const petName = usePets((s) => (petId ? s.pets.find((p) => p.id === petId)?.name : undefined));

  useEffect(() => {
    if (!hydrated) return;
    cancelled.current = false;

    (async () => {
      const deadline = Date.now() + POLL_TIMEOUT_MS;
      let lastFailed = false;
      while (!cancelled.current) {
        try {
          const ok = await hasRefloresta({ invalidateCache: true });
          lastFailed = false;
          if (ok) {
            if (cancelled.current) return;
            if (petId) {
              // Solo en DEV_FAKE_PURCHASE + backend mock: simula el webhook. Con backend real lo marca el webhook.
              const orderId = usePets.getState().getRefloresta(petId).orderId;
              if (env.devFakePurchase && orderId) await devMarkOrderPaid(orderId);
              usePets.getState().updateRefloresta(petId, { guardian: true });
              router.replace({ pathname: '/refloresta/gracias', params: { petId } });
            } else {
              router.replace('/(tabs)/home');
            }
            return;
          }
        } catch (e) {
          lastFailed = true;
          console.warn('[procesando] Error comprobando el entitlement', e);
        }
        if (Date.now() + POLL_INTERVAL_MS > deadline) break;
        await sleep(POLL_INTERVAL_MS);
      }
      if (!cancelled.current) {
        setOffline(lastFailed);
        setPhase('timeout');
      }
    })();

    return () => {
      cancelled.current = true;
    };
  }, [hydrated, petId, attempt]);

  const retry = useCallback(() => {
    setPhase('checking');
    setOffline(false);
    setAttempt((n) => n + 1);
  }, []);
  const goBack = useCallback(() => {
    if (petId) router.replace({ pathname: '/mascota/[id]', params: { id: petId } });
    else router.replace('/(tabs)/home');
  }, [petId]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.treeWrap} pointerEvents="none">
        <ArbolAnimado name={petName} size={240} />
      </View>

      {phase === 'checking' ? (
        <View style={styles.content} accessibilityLiveRegion="polite">
          <Text style={styles.title}>Plantando la semilla…</Text>
          <Text style={styles.subtitle}>
            {petName
              ? `Estamos confirmando tu pago para el árbol de ${petName}. Solo serán unos segundos.`
              : 'Estamos confirmando tu pago. Solo serán unos segundos.'}
          </Text>
          <ActivityIndicator color={colors.bosque} style={{ marginTop: spacing.md }} />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>Aún no lo vemos confirmado</Text>
          <Text style={styles.subtitle}>
            {offline
              ? 'Parece que no hay conexión. Comprueba tu red y vuelve a intentarlo.'
              : 'No hemos podido confirmar el pago. Si se ha completado, se activará en unos minutos.'}
          </Text>
          <Pressable
            onPress={retry}
            accessibilityRole="button"
            accessibilityLabel="Reintentar la comprobación del pago"
            style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
            <Text style={type.button}>Reintentar</Text>
          </Pressable>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.7 }]}>
            <Text style={styles.secondaryText}>Volver</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.crema },
  treeWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: spacing.lg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' },
  title: { ...type.h1, textAlign: 'center', color: colors.bosque },
  subtitle: { ...type.body, textAlign: 'center', marginTop: spacing.sm, color: colors.textoSuave },
  primary: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    backgroundColor: colors.bosque,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondary: { marginTop: spacing.sm, paddingVertical: spacing.md, alignSelf: 'stretch', alignItems: 'center' },
  secondaryText: { fontFamily: fonts.bold, fontSize: 16, color: colors.bosque },
});
