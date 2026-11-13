// Contrato compartido. Cambios → pedirlos a la sesión orquestadora.

export type Species = 'perro' | 'gato';

export type PlanId = 'barbiku80' | 'ilimitado';

export interface Plan {
  id: PlanId;
  name: string; // "Barbiku 80" | "Barbiku Ilimitado"
  description: string;
  monthlyPrice: number; // euros, ficticio
}

export interface Pet {
  id: string; // id local (UUID)
  name: string;
  species: Species;
  breed: string;
  birthDate: string; // ISO yyyy-mm-dd
  createdAt: string; // ISO
}

export interface Policy {
  id: string;
  petId: string;
  planId: PlanId;
  createdAt: string; // ISO
}

/** Estado local de Refloresta por mascota (nunca incluye estado del árbol). */
export interface PetRefloresta {
  /** Insignia "Guardiana del Bosque" (flag local tras entitlement). */
  guardian: boolean;
  /** Cuándo pulsó "Ahora no" (ISO). Banner de recuerdo durante 7 días. */
  offerDismissedAt?: string;
  /** El usuario cerró el banner con la X: no vuelve a salir. */
  bannerClosed?: boolean;
  /** Pedido en Supabase asociado a esta mascota. */
  orderId?: string;
  /** Texto grabado en la chapa (MAYÚSCULAS). */
  engravingText?: string;
}

export interface ShippingAddress {
  name: string;
  street: string;
  postalCode: string;
  city: string;
  province: string;
}

export interface UserProfile {
  name: string;
  email: string;
  address: ShippingAddress;
}

export type ChapaStatus = 'recibido' | 'grabando' | 'enviado';
export type OrderStatus = 'pending_payment' | 'paid' | 'refunded' | 'cancelled';

/** Lo ÚNICO que la app cliente lee de un pedido (sin tree_planted). */
export interface OrderSummary {
  id: string;
  pet_local_id: string;
  chapa_status: ChapaStatus;
  status: OrderStatus;
}

export interface NewOrderInput {
  appUserId: string;
  pet: Pick<Pet, 'id' | 'name' | 'species'>;
  engravingText: string;
  address: ShippingAddress;
}

export type EngravingResult =
  | { ok: true; value: string }
  | { ok: false; error: string };
