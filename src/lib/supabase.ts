// Acceso a Supabase desde la app (solo clave anon; nunca service role).
// Sin Supabase configurado (env.supabaseConfigured=false) usa un mock en memoria
// para que la demo funcione sin backend (incluido el panel admin).
import 'react-native-url-polyfill/auto';

import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';

import { env } from '@/config/env';
import { NET_AMOUNT, SOCIAL_PROOF_BASE } from '@/config/pricing';
import type { ChapaStatus, NewOrderInput, OrderSummary, Species } from '@/types';

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

let client: SupabaseClient | null = null;

function sb(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}

/** true si usamos el mock en memoria (sin backend). */
export const usingMockBackend = !env.supabaseConfigured;

// ---------------------------------------------------------------------------
// Mock en memoria (misma forma que la tabla refloresta_orders)
// ---------------------------------------------------------------------------

interface MockOrder {
  id: string;
  app_user_id: string;
  pet_local_id: string;
  pet_name: string;
  pet_species: Species;
  engraving_text: string;
  ship_name: string;
  ship_street: string;
  ship_postal_code: string;
  ship_city: string;
  ship_province: string;
  status: OrderSummary['status'];
  chapa_status: ChapaStatus;
  tree_planted: boolean;
  created_at: string;
  paid_at: string | null;
}

const mockOrders: MockOrder[] = [];

/** Código del panel admin en modo mock (sin Edge Functions). */
export const MOCK_ADMIN_PASSCODE = '1234';

function toSummary(o: MockOrder): OrderSummary {
  return { id: o.id, pet_local_id: o.pet_local_id, chapa_status: o.chapa_status, status: o.status };
}

/**
 * SOLO modo mock / DEV_FAKE_PURCHASE: simula el webhook de RevenueCat
 * marcando el pedido como pagado. Con backend real no hace nada (lo hace el webhook).
 */
export async function devMarkOrderPaid(orderId: string): Promise<void> {
  if (!usingMockBackend) return;
  const o = mockOrders.find((x) => x.id === orderId);
  if (!o || o.status !== 'pending_payment') return;
  const alreadyPaid = mockOrders.some(
    (x) => x.status === 'paid' && x.app_user_id === o.app_user_id && x.pet_local_id === o.pet_local_id,
  );
  if (alreadyPaid) return;
  o.status = 'paid';
  o.paid_at = new Date().toISOString();
}

// ---------------------------------------------------------------------------
// API de la app cliente (firmas = contrato)
// ---------------------------------------------------------------------------

/** Inserta pedido con status='pending_payment'. Devuelve su id. */
export async function createPendingOrder(input: NewOrderInput): Promise<string> {
  const id = randomUUID();
  const row = {
    id,
    app_user_id: input.appUserId,
    pet_local_id: input.pet.id,
    pet_name: input.pet.name,
    pet_species: input.pet.species,
    engraving_text: input.engravingText,
    ship_name: input.address.name,
    ship_street: input.address.street,
    ship_postal_code: input.address.postalCode,
    ship_city: input.address.city,
    ship_province: input.address.province,
  };

  if (usingMockBackend) {
    mockOrders.push({
      ...row,
      status: 'pending_payment',
      chapa_status: 'recibido',
      tree_planted: false,
      created_at: new Date().toISOString(),
      paid_at: null,
    });
    return id;
  }

  // Sin .select(): anon no tiene SELECT sobre la tabla (return=minimal).
  const { error } = await sb().from('refloresta_orders').insert(row);
  if (error) throw new Error(`No se ha podido crear el pedido: ${error.message}`);
  return id;
}

/** Pedidos del usuario: SOLO id, pet_local_id, chapa_status, status. */
export async function getMyOrders(appUserId: string): Promise<OrderSummary[]> {
  if (usingMockBackend) {
    return mockOrders
      .filter((o) => o.app_user_id === appUserId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(toSummary);
  }
  // RPC security definer: devuelve solo las columnas permitidas (nunca tree_planted).
  const { data, error } = await sb().rpc('get_my_orders', { p_app_user_id: appUserId });
  if (error) throw new Error(`No se han podido cargar los pedidos: ${error.message}`);
  return ((data ?? []) as OrderSummary[]).map((o) => ({
    id: o.id,
    pet_local_id: o.pet_local_id,
    chapa_status: o.chapa_status,
    status: o.status,
  }));
}

/** Pedido pagado más reciente de una mascota (para el estado de la chapa). */
export async function getPetOrder(appUserId: string, petLocalId: string): Promise<OrderSummary | null> {
  const orders = await getMyOrders(appUserId);
  return orders.find((o) => o.pet_local_id === petLocalId && o.status === 'paid') ?? null;
}

/** Contador de prueba social: SOCIAL_PROOF_BASE + public_stats.trees_funded. */
export async function getTreesFunded(): Promise<number> {
  if (usingMockBackend) {
    return SOCIAL_PROOF_BASE + mockOrders.filter((o) => o.status === 'paid').length;
  }
  try {
    const { data, error } = await sb().from('public_stats').select('trees_funded').single();
    if (error) throw error;
    return SOCIAL_PROOF_BASE + (Number(data?.trees_funded) || 0);
  } catch {
    // Sin conexión: mostramos la base para no romper la pantalla de oferta.
    return SOCIAL_PROOF_BASE;
  }
}

// ---------------------------------------------------------------------------
// API del panel admin (Edge Functions admin-orders / admin-update-order)
// ---------------------------------------------------------------------------

export interface AdminOrder {
  id: string;
  pet_name: string;
  pet_species: Species;
  engraving_text: string;
  ship_name: string;
  ship_street: string;
  ship_postal_code: string;
  ship_city: string;
  ship_province: string;
  chapa_status: ChapaStatus;
  tree_planted: boolean;
  created_at: string;
  paid_at: string | null;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  totals: { treesFunded: number; eurosRefloresta: number };
}

export interface AdminUpdate {
  id: string;
  chapa_status?: 'grabando' | 'enviado';
  tree_planted?: true;
}

/** Error de código de acceso incorrecto (401). */
export class AdminUnauthorizedError extends Error {
  constructor() {
    super('Código de acceso incorrecto');
  }
}

async function invokeAdmin<T>(fn: string, passcode: string, body: unknown): Promise<T> {
  const { data, error } = await sb().functions.invoke<T>(fn, {
    body: body as Record<string, unknown>,
    headers: { 'x-admin-passcode': passcode },
  });
  if (error) {
    if (error instanceof FunctionsHttpError && error.context?.status === 401) {
      throw new AdminUnauthorizedError();
    }
    throw new Error('No se ha podido conectar con el servidor');
  }
  return data as T;
}

export async function adminFetchOrders(passcode: string): Promise<AdminOrdersResponse> {
  if (usingMockBackend) {
    if (passcode !== MOCK_ADMIN_PASSCODE) throw new AdminUnauthorizedError();
    const paid = mockOrders
      .filter((o) => o.status === 'paid')
      .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''));
    return {
      orders: paid.map(({ app_user_id: _u, status: _s, ...o }) => ({ ...o })),
      totals: { treesFunded: paid.length, eurosRefloresta: paid.length * NET_AMOUNT },
    };
  }
  return invokeAdmin<AdminOrdersResponse>('admin-orders', passcode, {});
}

export async function adminUpdateOrder(passcode: string, update: AdminUpdate): Promise<void> {
  if (usingMockBackend) {
    if (passcode !== MOCK_ADMIN_PASSCODE) throw new AdminUnauthorizedError();
    const o = mockOrders.find((x) => x.id === update.id && x.status === 'paid');
    if (!o) throw new Error('Pedido no encontrado');
    if (update.chapa_status) o.chapa_status = update.chapa_status;
    if (update.tree_planted) o.tree_planted = true;
    return;
  }
  await invokeAdmin<{ ok: true }>('admin-update-order', passcode, update);
}
