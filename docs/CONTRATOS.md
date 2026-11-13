# Contratos compartidos entre sesiones

Fijados por la sesión orquestadora. **No los cambies por tu cuenta**: pide el cambio a la orquestadora, que lo hace en `main` y avisa al resto.

## Archivos de contrato (solo lectura para las sesiones)
- `src/types.ts` — tipos de dominio.
- `src/theme.ts` — paleta, fuentes (Nunito), espaciados. Estilos con `StyleSheet`.
- `src/config/pricing.ts`, `src/config/env.ts`.
- `src/store/user.ts`, `src/store/pets.ts` — Zustand + AsyncStorage.
- `src/data/mock.ts`.
- `src/app/_layout.tsx`, `src/app/(tabs)/_layout.tsx` — navegadores.
- Firmas exportadas de `src/lib/revenuecat.ts`, `src/lib/supabase.ts`, `src/lib/engraving.ts` (el dueño puede cambiar la implementación y añadir exports, no cambiar las firmas existentes).

## Navegación (rutas y parámetros)
| Ruta | Params | Quién navega aquí |
|---|---|---|
| `/` | — | arranque / logout |
| `/(tabs)/home` | — | tras login |
| `/alta` | — | botón "Asegurar otra mascota" en home |
| `/alta/confirmado` | `petId` | tras "Contratar" (usar `router.replace`) |
| `/refloresta/oferta` | `petId` | confirmado (auto tras 1,5 s, `router.replace`), banner de home, ficha |
| `/refloresta/envio` | `petId` | CTA de oferta |
| `/refloresta/procesando` | `petId` (también llega por deep link `barbiku://refloresta/procesando?petId=…`) | envío tras cerrar el navegador de pago |
| `/refloresta/gracias` | `petId` | procesando al confirmar entitlement (`router.replace`) |
| `/mascota/[id]` | `id` = petId | home, gracias ("Volver a mi mascota") |
| `/admin` | — | 5 toques en el logo del login, o URL directa |

"Ahora no" en la oferta: `usePets.getState().dismissOffer(petId)` y `router.dismissTo('/(tabs)/home')` (o `replace`).

## Flujo de compra (quién hace qué)
1. **envio** (refloresta-ui): valida grabado → `createPendingOrder()` → guarda `orderId` y `engravingText` con `updateRefloresta()` → `await openPurchaseLink(appUserId)` → `router.replace('/refloresta/procesando?petId=…')`.
2. **procesando** (pagos-revenuecat): polling `hasRefloresta({invalidateCache:true})` cada 2 s, 30 s máx → `updateRefloresta(petId,{guardian:true})` → `gracias`.
3. **webhook** (backend-supabase) marca el pedido `paid`. La app nunca actualiza `status`.

## API de Edge Functions (backend-supabase ↔ panel admin)
Todas con `Authorization: Bearer <SUPABASE_ANON_KEY>` (requisito de Supabase) y, las de admin, cabecera `x-admin-passcode: <código>`.

- `POST /functions/v1/admin-orders` → `200 { orders: AdminOrder[], totals: { treesFunded: number, eurosRefloresta: number } }` · `401` si el código es incorrecto.
  `AdminOrder = { id, pet_name, pet_species, engraving_text, ship_name, ship_street, ship_postal_code, ship_city, ship_province, chapa_status, tree_planted, created_at, paid_at }` (solo `status='paid'`).
- `POST /functions/v1/admin-update-order` body `{ id: string, chapa_status?: 'grabando'|'enviado', tree_planted?: true }` → `200 { ok: true }`.
- `POST /functions/v1/revenuecat-webhook` — llamada por RevenueCat con `Authorization: <RC_WEBHOOK_AUTH>`.

## Regla de oro (§9)
Ningún texto, pantalla ni consulta de la app cliente expone el estado del árbol. `tree_planted` solo existe en el panel admin.
