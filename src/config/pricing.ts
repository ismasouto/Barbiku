// Precio de Refloresta (§4). Verificar la tarifa real en la cuenta de Stripe.
// El precio que se cobra lo define el producto en RevenueCat/Stripe; esto debe coincidir.

export const NET_AMOUNT = 20; // € netos para Refloresta
export const STRIPE_PCT = 0.015; // 1,5 % (tarjetas estándar EEE, supuesto)
export const STRIPE_FIXED = 0.25; // 0,25 € fijos

/** Precio bruto redondeado a céntimos para que queden NET_AMOUNT netos. */
export function grossPrice(): number {
  const raw = (NET_AMOUNT + STRIPE_FIXED) / (1 - STRIPE_PCT);
  return Math.round(raw * 100) / 100; // 20.56
}

export function paymentFee(): number {
  return Math.round((grossPrice() - NET_AMOUNT) * 100) / 100; // 0.56
}

/** Formato es-ES: 20.56 → "20,56 €" */
export function formatEuro(n: number): string {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
  return `${s} €`;
}

/** "20 € para Refloresta + 0,56 € de gestión del pago" */
export function priceBreakdown(): string {
  return `${formatEuro(NET_AMOUNT)} para Refloresta + ${formatEuro(paymentFee())} de gestión del pago`;
}

/**
 * Base FICTICIA para el contador de prueba social (§7.4, §13).
 * Contador mostrado = SOCIAL_PROOF_BASE + pedidos pagados en Supabase.
 */
export const SOCIAL_PROOF_BASE = 1240;
