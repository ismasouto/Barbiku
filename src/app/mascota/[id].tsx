import { Redirect, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChapaStepper } from '@/components/seguro/ChapaStepper';
import {
  Button,
  Card,
  GuardianBadge,
  ageLabel,
  formatDate,
  formatEuros,
  speciesEmoji,
} from '@/components/seguro/ui';
import { env } from '@/config/env';
import { PLANS } from '@/data/mock';
import { getPetOrder, usingMockBackend } from '@/lib/supabase';
import { usePets } from '@/store/pets';
import { useUser } from '@/store/user';
import { colors, fonts, radius, spacing, type } from '@/theme';
import type { ChapaStatus } from '@/types';

const CHAPA_COPY: Record<ChapaStatus, string> = {
  recibido: 'Hemos recibido tu pedido. Pronto empezaremos a grabarla.',
  grabando: 'Estamos grabando el nombre en tu chapa ecológica.',
  enviado: '¡Tu chapa va de camino! La recibirás en unos días.',
};

// Ficha de la mascota (§7.8). Sin NINGUNA información sobre el estado del árbol (§9).
export default function MascotaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pet = usePets((s) => s.pets.find((p) => p.id === id));
  const policy = usePets((s) => s.policies.find((p) => p.petId === id));
  const refl = usePets((s) => s.refloresta[id ?? '']);
  const appUserId = useUser((s) => s.appUserId);

  const guardianFlag = refl?.guardian ?? false;
  const [entitlementActive, setEntitlementActive] = useState<boolean | null>(null);
  const [chapa, setChapa] = useState<ChapaStatus | null>(null);
  const [loadingChapa, setLoadingChapa] = useState(false);

  // Al entrar (y al volver a la pantalla) se refresca el estado de la chapa y el entitlement.
  useFocusEffect(
    useCallback(() => {
      if (!guardianFlag || !id) return;
      let active = true;
      setLoadingChapa(true);
      (appUserId ? getPetOrder(appUserId, id) : Promise.resolve(null))
        .then((order) => {
          if (!active) return;
          setChapa(order?.chapa_status ?? 'recibido');
          // Con backend real, sin pedido pagado (p. ej. reembolsado, §12) se oculta la insignia.
          // El pago es por mascota, así que se mira el pedido y no el entitlement (que es por usuario).
          if (!usingMockBackend && !env.devFakePurchase) setEntitlementActive(order !== null);
        })
        .catch(() => active && setChapa('recibido'))
        .finally(() => active && setLoadingChapa(false));
      return () => {
        active = false;
      };
    }, [guardianFlag, id, appUserId]),
  );

  if (!pet) return <Redirect href="/(tabs)/home" />;

  const guardian = guardianFlag && entitlementActive !== false;
  const plan = PLANS.find((p) => p.id === policy?.planId);
  const engraving = refl?.engravingText ?? pet.name.toUpperCase();

  return (
    <>
      <Stack.Screen options={{ title: pet.name, headerTintColor: colors.bosque }} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={[styles.avatar, guardian && styles.avatarGuardian]}>
            <Text style={styles.avatarEmoji}>{speciesEmoji(pet.species)}</Text>
          </View>
          <Text style={type.h1}>{pet.name}</Text>
          <Text style={type.small}>
            {pet.species === 'perro' ? 'Perro' : 'Gato'} · {pet.breed} · {ageLabel(pet.birthDate)}
          </Text>
          {guardian && <GuardianBadge />}
          {guardian && (
            <Text style={styles.guardianText}>{pet.name} ha plantado un árbol con Refloresta 💚</Text>
          )}
        </View>

        <Text style={styles.section}>Su seguro</Text>
        <Card style={{ gap: 6 }}>
          {plan && policy ? (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.planName}>🛡️ {plan.name}</Text>
                <View style={styles.activePill}>
                  <Text style={styles.activeText}>Activa</Text>
                </View>
              </View>
              <Text style={type.body}>{plan.description}</Text>
              <Text style={type.small}>
                {formatEuros(plan.monthlyPrice)}/mes · Desde el {formatDate(policy.createdAt)} · Nº{' '}
                {policy.id.slice(0, 8).toUpperCase()}
              </Text>
              <Text style={type.small}>Nacimiento: {formatDate(pet.birthDate)}</Text>
            </>
          ) : (
            <Text style={type.body}>No encontramos la póliza de {pet.name}.</Text>
          )}
        </Card>

        {guardian ? (
          <>
            <Text style={styles.section}>Tu chapa</Text>
            <Card>
              <View style={styles.chapaHeader}>
                <View style={styles.miniChapa} accessibilityElementsHidden importantForAccessibility="no">
                  <Text style={styles.miniChapaText} numberOfLines={1} adjustsFontSizeToFit>
                    {engraving}
                  </Text>
                  <Text style={styles.miniLeaf}>🍃</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>Chapa ecológica</Text>
                  <Text style={type.small}>Grabado: {engraving}</Text>
                </View>
              </View>
              {loadingChapa && chapa === null ? (
                <ActivityIndicator color={colors.bosque} style={{ marginTop: spacing.md }} />
              ) : (
                <>
                  <ChapaStepper status={chapa ?? 'recibido'} />
                  <Text style={[type.small, { marginTop: spacing.md, textAlign: 'center' }]}>
                    {CHAPA_COPY[chapa ?? 'recibido']}
                  </Text>
                </>
              )}
            </Card>

            <Button
              label="💚 Ver su tarjeta de agradecimiento"
              variant="secondary"
              onPress={() => router.push({ pathname: '/refloresta/gracias', params: { petId: pet.id } })}
            />
          </>
        ) : (
          <Pressable
            onPress={() => router.push({ pathname: '/refloresta/oferta', params: { petId: pet.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Plantar un árbol en honor a ${pet.name}`}
            style={({ pressed }) => [styles.softCta, pressed && { transform: [{ scale: 0.98 }] }]}>
            <Text style={{ fontSize: 30 }}>🌱</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.softTitle}>¿Plantamos un árbol en honor a {pet.name}?</Text>
              <Text style={type.small}>Y te regalamos una chapa ecológica con su nombre grabado.</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      </ScrollView>
    </>
  );
}

const CHAPA = 64;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.crema },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  hero: { alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.blanco,
    borderWidth: 3,
    borderColor: colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGuardian: { borderColor: colors.brote },
  avatarEmoji: { fontSize: 56 },
  guardianText: { ...type.body, color: colors.bosque, textAlign: 'center' },
  section: { fontFamily: fonts.bold, fontSize: 17, color: colors.texto, marginTop: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { fontFamily: fonts.bold, fontSize: 17, color: colors.texto },
  activePill: {
    backgroundColor: '#E6F4E2',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  activeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.bosque },
  chapaHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  miniChapa: {
    width: CHAPA,
    height: CHAPA,
    borderRadius: CHAPA / 2,
    backgroundColor: colors.madera1,
    borderWidth: 4,
    borderColor: colors.madera2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  miniChapaText: {
    fontFamily: fonts.black,
    fontSize: 12,
    color: '#5A3A1E',
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  miniLeaf: { fontSize: 10 },
  softCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#F1F8EE',
    borderWidth: 1.5,
    borderColor: colors.brote,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  softTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.bosque },
  chevron: { fontSize: 30, color: colors.bosque, fontFamily: fonts.bold },
});
