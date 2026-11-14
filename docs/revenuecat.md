# RevenueCat + Stripe (Web Billing): configuración

Fuente: documentación oficial de RevenueCat, consultada el 14/11/2026 (Web Purchase Links, instalación en Expo, Webhooks, tipos de evento y API v1), más el código de `react-native-purchases` 11.0.2.
Todo se hace en **modo test / sandbox**.

## 1. Proyecto y Web Billing con Stripe
1. En el dashboard de RevenueCat, crea el proyecto **Barbiku**.
2. Ve a *Apps & providers* → *Add app* → **Web** (RevenueCat Web Billing) y conecta tu cuenta de **Stripe en modo test**.
3. Copia la **clave pública** de esa app (empieza por `rcb_…`). Va en `EXPO_PUBLIC_REVENUECAT_API_KEY`.
4. (Opcional, solo para *development builds* nativas) añade al **mismo proyecto** una app iOS y otra Android. Pon sus claves (`appl_…` y `goog_…`) en `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` y `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`. Los entitlements se comparten entre apps del proyecto con el mismo `appUserID`.

## 2. Producto, entitlement y offering
1. *Product catalog* → *Products* → nuevo producto en la app Web:
   - Tipo **one-time / non-consumable** (compra única).
   - Identificador `refloresta`.
   - Nombre visible "Refloresta".
   - Precio **20,56 EUR**. Debe coincidir con `grossPrice()` de `src/config/pricing.ts`.
2. *Entitlements* → nuevo entitlement con identificador **`refloresta`** y el producto anterior asociado.
3. *Offerings* → offering `default` (márcala como *current*) con un package (p. ej. `$rc_lifetime`) que contenga el producto.


> **Nota (14/11/2026):** el producto real es **`refloresta_mascota`**, **consumible** de 20,56 EUR, para permitir **una compra por mascota** con el mismo usuario. Los anteriores (`refloresta`, suscripción, y `refloresta_unico`, no consumible) están archivados. Como el entitlement de RevenueCat es por usuario, la app **no** lo usa para confirmar el pago: manda el pedido en `metadata[order_id]` del Web Purchase Link, el webhook marca ese pedido como `paid` y la pantalla `procesando` y la ficha leen ese estado en Supabase.
>
> ⚠️ **El producto NO debe estar vinculado al entitlement `refloresta`.** Si lo está, el entitlement (que es por usuario) queda activo tras la primera compra y el Web Purchase Link da la siguiente compra de ese usuario por hecha sin cobrar: redirige a la página de éxito en unos segundos. El entitlement `refloresta` existe, pero sin productos.

## 3. Web Purchase Link
1. En la offering `default`, ve a *Web* → **Create Web Purchase Link**.
2. Copia la URL base `https://pay.rev.cat/<token>` en `EXPO_PUBLIC_RC_WEB_PURCHASE_LINK`. Para pruebas, usa la URL de **sandbox** que muestra el dashboard (no se comparte con clientes).
3. La app añade el usuario como segmento final: `https://pay.rev.cat/<token>/<appUserId>`. Sin él, RevenueCat devuelve 404.
4. **Página de éxito:** elige *Redirect to a custom success page* y pon `barbiku://refloresta/procesando`.
   - RevenueCat añade `?app_user_id=…` a esa URL.
   - El enlace no admite un parámetro de redirect en la URL, así que la vuelta se configura aquí y es fija.
   - Como no lleva `petId`, la pantalla `procesando` usa la última mascota con pedido creado y sin insignia.
5. Parámetros opcionales del enlace que no usamos: `email`, `currency`, `package_id`, `metadata[clave]=valor`, `skip_purchase_success=true` y `hide_back_button=true`.
6. Tarjeta de prueba de Stripe: `4242 4242 4242 4242`, con cualquier fecha futura y cualquier CVC.

## 4. Webhook
1. *Integrations* → **Webhooks** → *Add*:
   - **URL:** `https://<proyecto>.supabase.co/functions/v1/revenuecat-webhook`.
   - **Authorization header:** un secreto largo. Guárdalo también en Supabase: `supabase secrets set RC_WEBHOOK_AUTH=<secreto>`. RevenueCat lo envía literal en la cabecera `Authorization`.
   - **Entorno:** sandbox y producción (o solo sandbox para la demo).
2. Cuerpo: `{ "api_version": "1.0", "event": { … } }`. Campos útiles de `event`:
   - `id` (idempotencia: los reintentos reutilizan el mismo `id`), `type`, `app_user_id`, `original_app_user_id`, `aliases`.
   - `product_id`, `entitlement_ids` (puede venir `null`), `transaction_id`, `environment` (`SANDBOX`/`PRODUCTION`), `store` (`RC_BILLING`).
   - `price` (USD, negativo en reembolsos), `currency`, `cancel_reason`.
3. Tipos de evento:
   - Compra única → **`NON_RENEWING_PURCHASE`**. Conviene aceptar también `INITIAL_PURCHASE`.
   - Reembolso → no hay tipo `REFUND`: llega **`CANCELLATION`** con `cancel_reason = "CUSTOMER_SUPPORT"`.
   - `REFUND_REVERSED` y el evento `TEST` del dashboard **no** están soportados en Web Billing. Para probar, usa `npm run test:webhook`.
4. Responde 200 en menos de 60 s. Si no, RevenueCat reintenta hasta 5 veces.

## 5. Cómo lo usa la app (`src/lib/revenuecat.ts`)
| Entorno | Cómo lee el entitlement |
|---|---|
| Web y Expo Go | `react-native-purchases` entra en "Browser Mode" (purchases-js) y admite la clave `rcb_`. Usa `Purchases.configure` + `getCustomerInfo()`. |
| Development build nativa con claves `appl_`/`goog_` | SDK nativo, mismo `appUserID`. |
| Development build nativa sin esas claves | REST `GET https://api.revenuecat.com/v1/subscribers/{appUserId}` con la clave pública. Que la clave pública valga ahí no está confirmado en la documentación. |

- `invalidateCustomerInfoCache()` no existe en Browser Mode; se ignora el error.
- `openPurchaseLink` abre el enlace:
  - En móvil, con `WebBrowser.openAuthSessionAsync(url, 'barbiku://refloresta/procesando')`, que se cierra sola al volver.
  - En web, en una pestaña nueva.
- Con `EXPO_PUBLIC_DEV_FAKE_PURCHASE=true` no se llama a RevenueCat: el pago tarda ~1 s y el entitlement está siempre activo.
- La app **solo lee** el entitlement. El pedido lo marca como `paid` el webhook.
