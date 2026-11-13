// Panel interno (§7.9). Acceso con código validado por la Edge Function admin-orders.
// Pestaña Chapas (Barbiku) y pestaña Árboles (Refloresta). Nunca usa la service role.
import { Stack } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatEuro } from '@/config/pricing';
import {
  AdminUnauthorizedError,
  adminFetchOrders,
  adminUpdateOrder,
  usingMockBackend,
  type AdminOrder,
  type AdminOrdersResponse,
  type AdminUpdate,
} from '@/lib/supabase';
import { colors, fonts, radius, spacing, type } from '@/theme';
import type { ChapaStatus } from '@/types';

type Tab = 'chapas' | 'arboles';

const CHAPA_LABEL: Record<ChapaStatus, string> = {
  recibido: 'Recibido',
  grabando: 'Grabando',
  enviado: 'Enviado',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminScreen() {
  const [passcode, setPasscode] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminOrdersResponse | null>(null);
  const [tab, setTab] = useState<Tab>('chapas');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (code: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetchOrders(code);
        setData(res);
        setAuthed(true);
      } catch (e) {
        if (e instanceof AdminUnauthorizedError) {
          setAuthed(false);
          setError('Código de acceso incorrecto');
        } else {
          setError(e instanceof Error ? e.message : 'Error inesperado');
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const update = useCallback(
    async (u: AdminUpdate) => {
      setBusyId(u.id);
      setError(null);
      try {
        await adminUpdateOrder(passcode, u);
        await load(passcode);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se ha podido actualizar');
      } finally {
        setBusyId(null);
      }
    },
    [load, passcode],
  );

  if (!authed) {
    return (
      <SafeAreaView style={styles.screen}>
        <Stack.Screen options={{ title: 'Panel interno' }} />
        <View style={styles.loginBox}>
          <Text style={type.h1}>Panel interno</Text>
          <Text style={[type.body, { color: colors.textoSuave }]}>
            Acceso solo para el equipo de Barbiku y Refloresta.
          </Text>
          <TextInput
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Código de acceso"
            placeholderTextColor={colors.textoSuave}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => passcode && load(passcode)}
            style={styles.input}
            accessibilityLabel="Código de acceso"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            onPress={() => load(passcode)}
            disabled={!passcode || loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              (!passcode || loading) && { opacity: 0.5 },
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
          >
            {loading ? <ActivityIndicator color={colors.blanco} /> : <Text style={type.button}>Entrar</Text>}
          </Pressable>
          {usingMockBackend && (
            <Text style={type.small}>Modo demo sin backend: el código es 1234.</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const orders = data?.orders ?? [];

  return (
    <SafeAreaView style={styles.screen} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: 'Panel interno' }} />

      <View style={styles.totals}>
        <View style={styles.totalCard}>
          <Text style={styles.totalValue}>{data?.totals.treesFunded ?? 0}</Text>
          <Text style={type.small}>árboles financiados</Text>
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalValue}>{formatEuro(data?.totals.eurosRefloresta ?? 0)}</Text>
          <Text style={type.small}>para Refloresta</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['chapas', 'arboles'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'chapas' ? '🏷️ Chapas' : '🌳 Árboles'}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={[styles.error, { marginHorizontal: spacing.md }]}>{error}</Text>}

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(passcode)} />}
        ListEmptyComponent={
          <Text style={[type.body, { textAlign: 'center', color: colors.textoSuave }]}>
            Todavía no hay pedidos pagados.
          </Text>
        }
        renderItem={({ item }) =>
          tab === 'chapas' ? (
            <ChapaRow order={item} busy={busyId === item.id} onUpdate={update} />
          ) : (
            <ArbolRow order={item} busy={busyId === item.id} onUpdate={update} />
          )
        }
      />
    </SafeAreaView>
  );
}

function ChapaRow({
  order,
  busy,
  onUpdate,
}: {
  order: AdminOrder;
  busy: boolean;
  onUpdate: (u: AdminUpdate) => void;
}) {
  const next: AdminUpdate['chapa_status'] | null =
    order.chapa_status === 'recibido' ? 'grabando' : order.chapa_status === 'grabando' ? 'enviado' : null;

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.engraving}>{order.engraving_text}</Text>
        <View style={[styles.badge, badgeColor(order.chapa_status)]}>
          <Text style={styles.badgeText}>{CHAPA_LABEL[order.chapa_status]}</Text>
        </View>
      </View>
      <Text style={type.small}>
        {order.pet_name} · {order.pet_species} · pagado el {formatDate(order.paid_at)}
      </Text>
      <Text style={type.body}>{order.ship_name}</Text>
      <Text style={type.body}>{order.ship_street}</Text>
      <Text style={type.body}>
        {order.ship_postal_code} {order.ship_city} ({order.ship_province})
      </Text>
      {next && (
        <Pressable
          onPress={() => onUpdate({ id: order.id, chapa_status: next })}
          disabled={busy}
          style={({ pressed }) => [styles.secondaryBtn, (busy || pressed) && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={colors.bosque} />
          ) : (
            <Text style={styles.secondaryBtnText}>Pasar a «{CHAPA_LABEL[next]}»</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

/** Refloresta: solo nombre de la placa, especie, provincia y fecha (privacidad). */
function ArbolRow({
  order,
  busy,
  onUpdate,
}: {
  order: AdminOrder;
  busy: boolean;
  onUpdate: (u: AdminUpdate) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.engraving}>{order.engraving_text}</Text>
        {order.tree_planted && (
          <View style={[styles.badge, { backgroundColor: colors.brote }]}>
            <Text style={styles.badgeText}>Plantado</Text>
          </View>
        )}
      </View>
      <Text style={type.body}>
        {order.pet_species === 'perro' ? '🐶 Perro' : '🐱 Gato'} · {order.ship_province}
      </Text>
      <Text style={type.small}>Pagado el {formatDate(order.paid_at)}</Text>
      {!order.tree_planted && (
        <Pressable
          onPress={() => onUpdate({ id: order.id, tree_planted: true })}
          disabled={busy}
          style={({ pressed }) => [styles.secondaryBtn, (busy || pressed) && { opacity: 0.6 }]}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color={colors.bosque} />
          ) : (
            <Text style={styles.secondaryBtnText}>Marcar plantado (interno)</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function badgeColor(s: ChapaStatus) {
  switch (s) {
    case 'recibido':
      return { backgroundColor: colors.acento };
    case 'grabando':
      return { backgroundColor: colors.tierra };
    case 'enviado':
      return { backgroundColor: colors.bosque };
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.crema },
  loginBox: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  input: {
    backgroundColor: colors.blanco,
    borderWidth: 1,
    borderColor: colors.borde,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.texto,
  },
  primaryBtn: {
    backgroundColor: colors.bosque,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
  },
  error: { fontFamily: fonts.semibold, color: colors.error, fontSize: 14 },
  totals: { flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  totalCard: {
    flex: 1,
    backgroundColor: colors.blanco,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  totalValue: { fontFamily: fonts.black, fontSize: 26, color: colors.bosque },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.borde,
    borderRadius: radius.pill,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  tabActive: { backgroundColor: colors.blanco },
  tabText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textoSuave },
  tabTextActive: { color: colors.bosque, fontFamily: fonts.bold },
  card: {
    backgroundColor: colors.blanco,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  engraving: { fontFamily: fonts.black, fontSize: 20, letterSpacing: 2, color: colors.tierra },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.blanco },
  secondaryBtn: {
    marginTop: spacing.sm,
    borderWidth: 2,
    borderColor: colors.bosque,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.bosque },
});
