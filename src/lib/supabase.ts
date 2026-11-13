// STUB — lo implementa la sesión backend-supabase. Las firmas son contrato.
// Sin Supabase configurado (env.supabaseConfigured=false) debe funcionar con un mock en memoria.
import { SOCIAL_PROOF_BASE } from '@/config/pricing';
import type { NewOrderInput, OrderSummary } from '@/types';

/** Inserta pedido con status='pending_payment'. Devuelve su id. */
export async function createPendingOrder(input: NewOrderInput): Promise<string> {
  void input;
  return 'mock-order-id';
}

/** Pedidos del usuario: SOLO id, pet_local_id, chapa_status, status. */
export async function getMyOrders(appUserId: string): Promise<OrderSummary[]> {
  void appUserId;
  return [];
}

/** Pedido pagado más reciente de una mascota (para el estado de la chapa). */
export async function getPetOrder(appUserId: string, petLocalId: string): Promise<OrderSummary | null> {
  const orders = await getMyOrders(appUserId);
  return orders.find((o) => o.pet_local_id === petLocalId && o.status === 'paid') ?? null;
}

/** Contador de prueba social: SOCIAL_PROOF_BASE + public_stats.trees_funded. */
export async function getTreesFunded(): Promise<number> {
  return SOCIAL_PROOF_BASE;
}
