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
export const PRODUCT_ID = 'refloresta';
export const RETURN_PATH = 'refloresta/procesando';

/** Deep link de vuelta. Debe coincidir con la "custom success page" del Web Purchase Link. */
export const RETURN_URL = `${env.appScheme}://${RETURN_PATH}`;

const FAKE_DELAY_MS = 1000;
const RC_API = 'https://api.revenuecat.com/v1';

/** Claves opcionales para development builds nativas (no forman parte de env.ts). */
const nativeKeys = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',
};

function isExpoGo(): boolean {
  return Boolean((globalThis as { expo?: { modules?: { ExpoGo?: unknown } } }).expo?.modules?.ExpoGo);
}

type Mode = 'sdk' | 'rest';

/** Qué vía usar para leer el entitlement y con qué clave. */
function resolveMode(): { mode: Mode; apiKey: string } {
  if (Platform.OS === 'web' || isExpoGo()) return { mode: 'sdk', apiKey: env.revenueCatApiKey };
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

  if (opts?.invalidateCache) {
    try {
      await Purchases.invalidateCustomerInfoCache();
    } catch {
      // En web/Expo Go (purchases-js) no está soportado; getCustomerInfo ya consulta el servidor.
    }
  }
  const info = await Purchases.getCustomerInfo();
  return info.entitlements.active[ENTITLEMENT_ID] !== undefined;
}

/** URL del Web Purchase Link con el appUserId (formato oficial: https://pay.rev.cat/<token>/<appUserId>). */
export function buildPurchaseUrl(appUserId: string): string {
  const base = env.rcWebPurchaseLink.replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(appUserId)}`;
}

/**
 * Abre el Web Purchase Link con el appUserId (formato oficial) y la URL de vuelta
 * barbiku://refloresta/procesando si se admite. Resuelve cuando el navegador se cierra.
 *
 * La URL de vuelta no se pasa en el enlace: RevenueCat la toma de la "custom success page"
 * configurada en el dashboard. Aquí solo se usa para que la sesión de navegador se cierre
 * sola al detectarla.
 */
export async function openPurchaseLink(appUserId: string): Promise<void> {
  if (env.devFakePurchase) {
    await new Promise((r) => setTimeout(r, FAKE_DELAY_MS));
    return;
  }
  if (!env.rcWebPurchaseLink) throw new Error('Falta EXPO_PUBLIC_RC_WEB_PURCHASE_LINK.');
  const url = buildPurchaseUrl(appUserId);

  if (Platform.OS === 'web') {
    // En web se abre en otra pestaña; procesando hará el polling mientras tanto.
    await WebBrowser.openBrowserAsync(url);
    return;
  }
  await WebBrowser.openAuthSessionAsync(url, RETURN_URL);
}
