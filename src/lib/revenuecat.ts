// STUB — lo implementa la sesión pagos-revenuecat. Las firmas son contrato.
import { env } from '@/config/env';

export const ENTITLEMENT_ID = 'refloresta';
export const PRODUCT_ID = 'refloresta';
export const RETURN_PATH = 'refloresta/procesando';

/** Purchases.configure({ apiKey, appUserID }). Idempotente. */
export async function configureRC(appUserId: string): Promise<void> {
  void appUserId;
}

/** True si entitlements.active["refloresta"] existe (o compra simulada en DEV). */
export async function hasRefloresta(opts?: { invalidateCache?: boolean }): Promise<boolean> {
  void opts;
  return env.devFakePurchase;
}

/**
 * Abre el Web Purchase Link con el appUserId (formato oficial) y la URL de vuelta
 * barbiku://refloresta/procesando si se admite. Resuelve cuando el navegador se cierra.
 */
export async function openPurchaseLink(appUserId: string): Promise<void> {
  void appUserId;
}
