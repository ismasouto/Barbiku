// Integración con RevenueCat Web Billing (Stripe). Ver docs/revenuecat.md.
//
// Cómo se comprueba el entitlement según el entorno (react-native-purchases 11):
// - Web y Expo Go: el SDK entra en "Browser Mode" (purchases-js) y acepta la clave
//   pública de Web Billing (rcb_…). Es la vía principal de la demo.
// - Development build nativa: el SDK nativo espera claves appl_/goog_ del MISMO
//   proyecto RevenueCat (los entitlements se comparten por appUserID). Si no están
//   configuradas, se consulta la REST API v1 (GET /subscribers) con la clave pública.
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

import { env } from '@/config/env';
import { useUser } from '@/store/user';

export const ENTITLEMENT_ID = 'refloresta';
/** store_identifier del producto consumible (una compra por mascota) en RevenueCat. */
export const PRODUCT_ID = 'refloresta_mascota';
export const RETURN_PATH = 'refloresta/procesando';

/** Deep link de vuelta. Debe coincidir con la "custom success page" del Web Purchase Link. */
export const RETURN_URL = `${env.appScheme}://${RETURN_PATH}`;

const FAKE_DELAY_MS = 1000;
const RC_API = 'https://api.revenuecat.com/v1';

/** Claves opcionales para development builds nativas. */
const nativeKeys = { ios: env.revenueCatIosKey, android: env.revenueCatAndroidKey };

function isExpoGo(): boolean {
  return Boolean((globalThis as { expo?: { modules?: { ExpoGo?: unknown } } }).expo?.modules?.ExpoGo);
}

/** react-native-purchases usa purchases-js (Browser Mode) en web y Expo Go. */
function isBrowserMode(): boolean {
  return Platform.OS === 'web' || isExpoGo();
}

type Mode = 'sdk' | 'rest';

/** Qué vía usar para leer el entitlement y con qué clave. */
function resolveMode(): { mode: Mode; apiKey: string } {
  if (isBrowserMode()) return { mode: 'sdk', apiKey: env.revenueCatApiKey };
  const native = Platform.OS === 'ios' ? nativeKeys.ios : nativeKeys.android;
  if (native) return { mode: 'sdk', apiKey: native };
  return { mode: 'rest', apiKey: env.revenueCatApiKey };
}

let configuredFor: string | null = null;
let restUserId: string | null = null;

/** Purchases.configure({ apiKey, appUserID }). Idempotente. */
export async function configureRC(appUserId: string): Promise<void> {
  if (env.devFakePurchase) return;
  const { mode, apiKey } = resolveMode();
  if (!apiKey) {
    console.warn('[RevenueCat] Falta EXPO_PUBLIC_REVENUECAT_API_KEY.');
    return;
  }
  if (mode === 'rest') {
    restUserId = appUserId;
    return;
  }
  if (configuredFor === appUserId) return;
  if (configuredFor && configuredFor !== appUserId) {
    // Cambio de usuario (p. ej. "Reiniciar demo") sin reconfigurar el SDK.
    await Purchases.logIn(appUserId);
  } else {
    Purchases.configure({ apiKey, appUserID: appUserId });
  }
  configuredFor = appUserId;
}

/** Asegura la configuración con el appUserId del store si nadie la hizo antes (p. ej. deep link en frío). */
async function ensureConfigured(): Promise<string | null> {
  const appUserId = useUser.getState().appUserId;
  if (!appUserId) return null;
  if (configuredFor !== appUserId && restUserId !== appUserId) await configureRC(appUserId);
  return appUserId;
}

async function hasEntitlementViaRest(appUserId: string, apiKey: string): Promise<boolean> {
  const res = await fetch(`${RC_API}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`RevenueCat REST ${res.status}`);
  const body = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, { expires_date: string | null }> };
  };
  const ent = body.subscriber?.entitlements?.[ENTITLEMENT_ID];
  if (!ent) return false;
  return ent.expires_date === null || new Date(ent.expires_date).getTime() > Date.now();
}

/** True si entitlements.active["refloresta"] existe (o compra simulada en DEV). */
export async function hasRefloresta(opts?: { invalidateCache?: boolean }): Promise<boolean> {
  if (env.devFakePurchase) return true;
  const appUserId = await ensureConfigured();
  if (!appUserId) return false;

  const { mode, apiKey } = resolveMode();
  if (!apiKey) return false;
  if (mode === 'rest') return hasEntitlementViaRest(appUserId, apiKey);

  // En web/Expo Go (Browser Mode) invalidateCustomerInfoCache no existe y el SDK la llama sin
  // esperar su promesa, así que el error se escapa del try/catch ("Uncaught (in promise)").
  // Ahí no hace falta: getCustomerInfo ya consulta al servidor.
  if (opts?.invalidateCache && !isBrowserMode()) {
    try {
      await Purchases.invalidateCustomerInfoCache();
    } catch {
      // Ignorado: la consulta siguiente devuelve el estado del servidor igualmente.
    }
  }
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/**
 * URL del Web Purchase Link con el appUserId (formato oficial: https://pay.rev.cat/<token>/<appUserId>).
 * `orderId` viaja como metadata[order_id] para que el webhook marque como pagado ese pedido exacto.
 */
export function buildPurchaseUrl(appUserId: string, orderId?: string): string {
  const base = env.rcWebPurchaseLink.replace(/\/+$/, '');
  const params: string[] = [];
  // Prerrellena el email en el checkout (parámetro oficial `email`).
  const email = useUser.getState().profile.email?.trim();
  if (email) params.push(`email=${encodeURIComponent(email)}`);
  if (orderId) params.push(`${encodeURIComponent('metadata[order_id]')}=${encodeURIComponent(orderId)}`);
  const url = `${base}/${encodeURIComponent(appUserId)}`;
  return params.length ? `${url}?${params.join('&')}` : url;
}

/**
 * Abre el Web Purchase Link con el appUserId (formato oficial) y la URL de vuelta
 * barbiku://refloresta/procesando si se admite. Resuelve cuando el navegador se cierra.
 *
 * La URL de vuelta no se pasa en el enlace: RevenueCat la toma de la "custom success page"
 * configurada en el dashboard. Aquí solo se usa para que la sesión de navegador se cierre
 * sola al detectarla.
 */
export async function openPurchaseLink(appUserId: string, orderId?: string): Promise<void> {
  if (env.devFakePurchase) {
    await new Promise((r) => setTimeout(r, FAKE_DELAY_MS));
    return;
  }
  if (!env.rcWebPurchaseLink) throw new Error('Falta EXPO_PUBLIC_RC_WEB_PURCHASE_LINK.');
  const url = buildPurchaseUrl(appUserId, orderId);

  if (Platform.OS === 'web') {
    // En web se abre en otra pestaña; procesando hará el polling mientras tanto.
    await WebBrowser.openBrowserAsync(url);
    return;
  }
  await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
}
