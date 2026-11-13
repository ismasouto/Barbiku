// Variables públicas de la app (EXPO_PUBLIC_*). Los secretos nunca van aquí.

export const env = {
  revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '',
  /** Opcionales: claves nativas (appl_/goog_) para dev builds. Sin ellas se usa REST. */
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '',
  rcWebPurchaseLink: process.env.EXPO_PUBLIC_RC_WEB_PURCHASE_LINK ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  appScheme: process.env.EXPO_PUBLIC_APP_SCHEME ?? 'barbiku',
  /** Simula la compra sin RevenueCat/Stripe (§14.4). */
  devFakePurchase: process.env.EXPO_PUBLIC_DEV_FAKE_PURCHASE === 'true',
  /** Sin Supabase configurado, lib/supabase usa un mock en memoria. */
  supabaseConfigured: Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
};
