# Backend (Supabase) — despliegue y pruebas

Todo lo de backend vive en `supabase/`:

| Ruta | Qué es |
|---|---|
| `supabase/config.toml` | Config del CLI. Las tres funciones tienen `verify_jwt = false`: se protegen con su propia cabecera. |
| `supabase/migrations/001_init.sql` | Tablas `refloresta_orders`, `webhook_events`, vista `public_stats`, RLS y función `get_my_orders`. |
| `supabase/functions/revenuecat-webhook` | Webhook de RevenueCat → `paid` / `refunded` (idempotente). |
| `supabase/functions/admin-orders` | Panel interno: pedidos pagados + totales. |
| `supabase/functions/admin-update-order` | Panel interno: avanzar chapa / marcar árbol plantado (solo interno). |
| `scripts/send-test-webhook.ts` | Pruebas end-to-end (`npm run test:webhook`). |

## Modelo de acceso (§8, §9)

- **anon (la app)**
  - `INSERT` en `refloresta_orders` solo de las columnas de datos (id, app_user_id, mascota, grabado, dirección). La política RLS exige `status = 'pending_payment'`, `chapa_status = 'recibido'`, `tree_planted = false`. No puede escribir `status`, `tree_planted`, `paid_at`, `rc_transaction_id` ni importes (privilegios de columna).
  - **Sin `SELECT`/`UPDATE`/`DELETE`** sobre la tabla. Lee sus pedidos con la RPC `get_my_orders(p_app_user_id)` (security definer), que devuelve **solo** `id, pet_local_id, chapa_status, status`. `tree_planted` nunca sale hacia la app.
  - `SELECT` sobre la vista `public_stats` (`trees_funded`, sin datos personales) para el contador de prueba social.
- **service_role**: solo dentro de las Edge Functions. Nunca en la app.

> **Demo vs. producción:** el `app_user_id` es un UUID aleatorio generado en el dispositivo y hace de "secreto" para leer los propios pedidos. En producción esto iría con autenticación real (Supabase Auth) y políticas basadas en `auth.uid()`.

Sin `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` la app usa un **mock en memoria** (`src/lib/supabase.ts`): pedidos, contador y panel admin (código `1234`) funcionan sin backend. En ese modo `devMarkOrderPaid(orderId)` simula el webhook.

## Despliegue en Supabase Cloud

Requisitos: CLI de Supabase (`npx supabase@latest …` sirve, no hace falta instalarlo).

1. **Crear el proyecto** en https://supabase.com/dashboard (región UE, p. ej. Frankfurt). Apunta el *Project ref* (`abcdefghijklmnop`).
2. **Enlazar y migrar:**
   ```bash
   npx supabase login
   npx supabase link --project-ref <PROJECT_REF>
   npx supabase db push
   ```
   (Alternativa sin CLI: pegar `supabase/migrations/001_init.sql` en el SQL Editor y ejecutarlo.)
3. **Secrets de las funciones** (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente en producción):
   ```bash
   npx supabase secrets set RC_WEBHOOK_AUTH="Bearer <cadena-aleatoria-larga>" ADMIN_PASSCODE="<código-del-panel>"
   ```
   Genera la cadena con `openssl rand -hex 32`.
4. **Desplegar funciones:**
   ```bash
   npx supabase functions deploy revenuecat-webhook --no-verify-jwt
   npx supabase functions deploy admin-orders --no-verify-jwt
   npx supabase functions deploy admin-update-order --no-verify-jwt
   ```
5. **Webhook en RevenueCat** (Project settings → Integrations → Webhooks → *Add new configuration*):
   - URL: `https://<PROJECT_REF>.supabase.co/functions/v1/revenuecat-webhook`
   - *Authorization header value*: exactamente el mismo valor que `RC_WEBHOOK_AUTH` (p. ej. `Bearer 3f9a…`).
   - Entorno: *Sandbox* (o ambos) para el hackathon.
   - Botón *Send test event*: debe responder 200 (`ignored: other_product`, porque el evento `TEST` no es de `refloresta`).
6. **App** (`.env`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>   # Settings → API
   ```

## Webhook: qué hace

1. `Authorization` ≠ `RC_WEBHOOK_AUTH` → **401**.
2. Inserta el evento en `webhook_events` (id del evento como PK). Si ya existe → **200** `{duplicate:true}` y nada más.
3. Solo actúa si `product_id = 'refloresta'` o `entitlement_ids` contiene `refloresta`; si no → 200 `ignored`.
4. `NON_RENEWING_PURCHASE` / `INITIAL_PURCHASE` → busca el pedido `pending_payment` más reciente de `app_user_id` (también `original_app_user_id` y `aliases`) y lo pasa a `paid`, `paid_at = now()`, `rc_transaction_id`. Sin pedido pendiente → log + 200.
5. `CANCELLATION` / `REFUND` → pedido con ese `transaction_id` (o el último `paid` del usuario) a `refunded`.
6. Errores de base de datos → 500 (RevenueCat reintenta); todo lo demás → 200.

> Los tipos de evento están pendientes de confirmar contra la documentación oficial (sesión pagos-revenuecat). Están en dos `Set` al principio de `revenuecat-webhook/index.ts`.

## Pruebas en local (Docker)

```bash
npx supabase start -x studio,imgproxy,logflare,vector,supavisor,realtime,storage-api,mailpit,postgres-meta
npx supabase status          # URL de la API y claves anon / service_role
```

Crea `supabase/functions/.env` (no se commitea):
```
RC_WEBHOOK_AUTH=Bearer test-secret
ADMIN_PASSCODE=1234
```

```bash
npx supabase functions serve --env-file supabase/functions/.env
# en otra terminal, con EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321,
# EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon de supabase status> y RC_WEBHOOK_AUTH="Bearer test-secret"
npm run test:webhook
```

La suite comprueba: insert anon `pending_payment`, insert anon con `status=paid` rechazado, 401, compra → `paid`, duplicado ignorado, anon no puede leer `tree_planted` ni la tabla ni actualizar `status`, `get_my_orders` solo devuelve las 4 columnas, `public_stats` legible, reembolso → `refunded`.

Eventos sueltos contra cualquier entorno:
```bash
npm run test:webhook -- purchase <appUserId>
npm run test:webhook -- refund <appUserId>
```

Panel admin a mano:
```bash
curl -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/admin-orders" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY" -H "x-admin-passcode: 1234"
```
