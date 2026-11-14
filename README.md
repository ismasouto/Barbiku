# Barbiku × Refloresta

App Expo de demo (hackathon) de **Barbiku**, una aseguradora de mascotas ficticia. Justo después de dar de alta el seguro, ofrece plantar un árbol en honor a la mascota con **Refloresta**, una ONG ficticia. Cuesta **20,56 €** en pago único: 20 € netos para Refloresta y el resto cubre la comisión de Stripe. Como regalo, el cliente recibe una **chapa ecológica** con el nombre de su mascota grabado.

El cobro lo gestiona **RevenueCat Web Billing**, que cobra con Stripe en modo test. Los pedidos se guardan en **Supabase**, y un panel interno permite a Barbiku y a Refloresta gestionar las chapas y los árboles. El cliente **nunca** ve el estado del árbol. La especificación completa está en [`CLAUDE.md`](CLAUDE.md).

## Requisitos
- Node 20 o superior y npm.
- Para móvil, Expo Go o una development build. Para web basta un navegador.

## Instalación
```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run web               # o: npx expo start
```
Con el `.env` tal cual (`EXPO_PUBLIC_DEV_FAKE_PURCHASE=true` y sin claves de Supabase) **toda la demo funciona sin backend**:
- La compra se simula.
- Los pedidos se guardan en memoria. Al recargar la página, el panel interno se vacía.
- El código del panel interno es `1234`.

## Variables de entorno (`.env`)
| Variable | Valor |
|---|---|
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | Clave pública de la app Web Billing en RevenueCat (`rcb_…`) |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `_ANDROID_API_KEY` | Opcionales, solo para development builds nativas (`appl_…` / `goog_…`) |
| `EXPO_PUBLIC_RC_WEB_PURCHASE_LINK` | URL base del Web Purchase Link, sin el usuario al final (`https://pay.rev.cat/<token>`) |
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anon pública (o *publishable key*) de Supabase |
| `EXPO_PUBLIC_APP_SCHEME` | `barbiku` |
| `EXPO_PUBLIC_DEV_FAKE_PURCHASE` | `true` simula el pago. Ponlo a `false` para pagar con Stripe test |

Los secretos `RC_WEBHOOK_AUTH` y `ADMIN_PASSCODE` **no van en `.env`**: se guardan como *secrets* de Supabase. `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las inyecta Supabase automáticamente en las Edge Functions.

## Configuración externa paso a paso
1. **Supabase** (tablas, permisos RLS, Edge Functions, secrets): [`docs/backend.md`](docs/backend.md).
2. **RevenueCat + Stripe** (Web Billing, producto, entitlement y offering `refloresta`, Web Purchase Link, webhook): [`docs/revenuecat.md`](docs/revenuecat.md).
3. **Stripe:** comprueba en tu cuenta la tarifa de las tarjetas del EEE. Si no es 1,5 % + 0,25 €, ajusta [`src/config/pricing.ts`](src/config/pricing.ts) y el precio del producto en RevenueCat; ambos deben coincidir.

Tarjeta de prueba: `4242 4242 4242 4242`, con cualquier fecha futura y cualquier CVC.

## Scripts
| Comando | Qué hace |
|---|---|
| `npm run web` | Arranca la app en el navegador |
| `npm run typecheck` | `tsc --noEmit` |
| `npx eslint src` | Lint |
| `npx tsx src/lib/engraving.test.ts` | Tests del grabado y del precio |
| `npm run test:webhook` | Pruebas del webhook contra Supabase (ver `docs/backend.md`) |

## Estructura
- `src/app/`: pantallas (Expo Router). Login, inicio, alta, oferta, envío, procesando, gracias, ficha de la mascota y panel admin.
- `src/components/`: chapa, árbol animado, botón de llamada a la acción, confeti y tarjeta para compartir. Lo del flujo de seguro está en `seguro/`.
- `src/lib/`: `revenuecat.ts`, `supabase.ts` (incluye el mock) y `engraving.ts`.
- `src/store/`: estado local con Zustand y AsyncStorage.
- `src/config/`: precios y variables de entorno.
- `supabase/`: migración y Edge Functions.
- `docs/`: contratos y guías de configuración.

## Guion de la demo
1. Login (pulsar el logo 5 veces abre el panel admin; mantenerlo pulsado reinicia la demo). Se ve el inicio con Toby y el banner de recuerdo.
2. "Asegurar otra mascota" → alta de Luna → "Luna ya está protegida" → se abre la oferta.
3. "Plantar el árbol de Luna" → confirmar el grabado y la dirección → pago (simulado, o Stripe test) → "Plantando la semilla…" → pantalla de gracias.
4. Ficha de Luna: insignia "Guardiana del Bosque" y chapa en estado "Recibido".
5. Panel admin: el pedido aparece en Chapas y en Árboles. Pasar la chapa a "Grabando" se refleja en la ficha. "Marcar plantado" no cambia nada para el cliente.

> `SOCIAL_PROOF_BASE = 1240` es una cifra base **ficticia** para el contador de la oferta. El número mostrado es esa base más los pedidos pagados reales.
