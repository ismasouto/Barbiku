// Sincroniza la insignia "Guardiana del Bosque" (flag local) con los pedidos pagados en Supabase.
// La fuente de verdad es el pedido pagado de cada mascota (lo marca el webhook de RevenueCat):
// - pedido pagado y sin flag → se activa (p. ej. si "procesando" agotó el tiempo);
// - flag sin pedido pagado → se quita (reembolso §12, o datos de pruebas antiguas), y la
//   mascota vuelve a poder plantar su árbol.
import { env } from '@/config/env';
import { getMyOrders, usingMockBackend } from '@/lib/supabase';
import { usePets } from '@/store/pets';

export async function syncGuardians(appUserId: string | null): Promise<void> {
  if (!appUserId || usingMockBackend || env.devFakePurchase) return;
  let paidPets: Set<string>;
  try {
    const orders = await getMyOrders(appUserId);
    paidPets = new Set(orders.filter((o) => o.status === 'paid').map((o) => o.pet_local_id));
  } catch {
    return; // Sin conexión: se mantiene lo que hay en local.
  }
  const { pets, refloresta, updateRefloresta } = usePets.getState();
  for (const pet of pets) {
    const paid = paidPets.has(pet.id);
    if ((refloresta[pet.id]?.guardian ?? false) !== paid) updateRefloresta(pet.id, { guardian: paid });
  }
}
