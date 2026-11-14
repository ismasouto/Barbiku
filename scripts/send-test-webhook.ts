/**
 * Envía eventos de prueba de RevenueCat a la Edge Function revenuecat-webhook (§10).
 *
 * Uso:
 *   npm run test:webhook                      # suite completa (ver abajo)
 *   npm run test:webhook -- purchase <appUserId>   # solo un evento de compra
 *   npm run test:webhook -- refund <appUserId>     # solo un evento de reembolso
 *
 * Variables (se leen del entorno o de .env):
 *   EXPO_PUBLIC_SUPABASE_URL       p. ej. http://127.0.0.1:54321 (local)
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY  clave anon / publishable
 *   RC_WEBHOOK_AUTH                el mismo valor que el secret de la función
 *
 * Suite completa (`all`):
 *   1. Como anon: crea un pedido pending_payment.
 *   2. Webhook sin cabecera correcta → 401.
 *   3. Webhook NON_RENEWING_PURCHASE → el pedido pasa a paid.
 *   4. Mismo evento otra vez → duplicate (idempotencia).
 *   5. Como anon: leer tree_planted y actualizar status deben fallar.
 *   6. Webhook CANCELLATION → refunded.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

function loadDotEnv() {
  if (!existsSync('.env')) return;
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321').replace(/\/$/, '');
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const RC_AUTH = process.env.RC_WEBHOOK_AUTH ?? '';
const WEBHOOK = `${SUPABASE_URL}/functions/v1/revenuecat-webhook`;

function event(type: string, appUserId: string, transactionId: string) {
  return {
    api_version: '1.0',
    event: {
      id: randomUUID().toUpperCase(),
      type,
      app_user_id: appUserId,
      original_app_user_id: appUserId,
      aliases: [appUserId],
      product_id: 'refloresta_unico',
      entitlement_ids: ['refloresta'],
      period_type: 'NORMAL',
      purchased_at_ms: Date.now(),
      environment: 'SANDBOX',
      store: 'RC_BILLING',
      currency: 'EUR',
      price_in_purchased_currency: 20.56,
      transaction_id: transactionId,
      original_transaction_id: transactionId,
      cancel_reason: type === 'CANCELLATION' ? 'CUSTOMER_SUPPORT' : undefined,
      event_timestamp_ms: Date.now(),
    },
  };
}

async function sendWebhook(body: unknown, auth = RC_AUTH) {
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

async function myOrders(appUserId: string) {
  const res = await rest('rpc/get_my_orders', {
    method: 'POST',
    body: JSON.stringify({ p_app_user_id: appUserId }),
  });
  return (await res.json()) as { id: string; status: string }[];
}

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

async function suite() {
  if (!ANON) throw new Error('Falta EXPO_PUBLIC_SUPABASE_ANON_KEY');
  if (!RC_AUTH) throw new Error('Falta RC_WEBHOOK_AUTH');
  const appUserId = randomUUID();
  const orderId = randomUUID();
  const tx = `test_tx_${Date.now()}`;

  // 1. Pedido pending como anon
  const ins = await rest('refloresta_orders', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: orderId,
      app_user_id: appUserId,
      pet_local_id: 'pet-luna',
      pet_name: 'Luna',
      pet_species: 'gato',
      engraving_text: 'LUNA',
      ship_name: 'Lucía Pérez',
      ship_street: 'Calle del Olmo 12',
      ship_postal_code: '28004',
      ship_city: 'Madrid',
      ship_province: 'Madrid',
    }),
  });
  check('anon crea pedido pending_payment', ins.status === 201, `HTTP ${ins.status}`);

  const insPaid = await rest('refloresta_orders', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      app_user_id: appUserId, pet_local_id: 'x', pet_name: 'X', pet_species: 'perro',
      engraving_text: 'X', ship_name: 'a', ship_street: 'a', ship_postal_code: 'a',
      ship_city: 'a', ship_province: 'a', status: 'paid',
    }),
  });
  check('anon NO puede insertar con status=paid', insPaid.status >= 400, `HTTP ${insPaid.status}`);

  // 2. 401
  const bad = await sendWebhook(event('NON_RENEWING_PURCHASE', appUserId, tx), 'incorrecto');
  check('webhook con auth incorrecta → 401', bad.status === 401, `HTTP ${bad.status}`);

  // 3. Compra
  const purchase = event('NON_RENEWING_PURCHASE', appUserId, tx);
  const r1 = await sendWebhook(purchase);
  check('webhook compra → 200', r1.status === 200, r1.body);
  let orders = await myOrders(appUserId);
  check('pedido pasa a paid', orders.some((o) => o.id === orderId && o.status === 'paid'), JSON.stringify(orders));

  // 4. Duplicado
  const r2 = await sendWebhook(purchase);
  check('evento duplicado → 200 ignorado', r2.status === 200 && r2.body.includes('duplicate'), r2.body);

  // 5. RLS
  const selTree = await rest(`refloresta_orders?select=tree_planted&app_user_id=eq.${appUserId}`);
  check('anon NO puede leer tree_planted', selTree.status >= 400, `HTTP ${selTree.status} ${await selTree.text()}`);
  const selAll = await rest(`refloresta_orders?select=id&app_user_id=eq.${appUserId}`);
  check('anon NO puede leer la tabla directamente', selAll.status >= 400, `HTTP ${selAll.status}`);
  const upd = await rest(`refloresta_orders?id=eq.${orderId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  orders = await myOrders(appUserId);
  check(
    'anon NO puede actualizar status',
    upd.status >= 400 && orders.some((o) => o.id === orderId && o.status === 'paid'),
    `HTTP ${upd.status}`,
  );
  const rpcCols = await rest('rpc/get_my_orders', { method: 'POST', body: JSON.stringify({ p_app_user_id: appUserId }) });
  const cols = Object.keys(((await rpcCols.json()) as object[])[0] ?? {}).sort().join(',');
  check('get_my_orders solo devuelve columnas permitidas', cols === 'chapa_status,id,pet_local_id,status', cols);
  const stats = await rest('public_stats?select=trees_funded');
  check('anon puede leer public_stats', stats.status === 200, await stats.text());

  // 6. Reembolso
  const r3 = await sendWebhook(event('CANCELLATION', appUserId, tx));
  orders = await myOrders(appUserId);
  check('webhook reembolso → refunded', r3.status === 200 && orders.some((o) => o.id === orderId && o.status === 'refunded'), r3.body);

  console.log(failures ? `\n${failures} comprobación(es) fallida(s)` : '\nTodo correcto 🌳');
  process.exit(failures ? 1 : 0);
}

async function main() {
  const [mode = 'all', appUserId] = process.argv.slice(2);
  console.log(`→ ${WEBHOOK}`);
  if (mode === 'all') return suite();
  if (!appUserId) throw new Error(`Uso: npm run test:webhook -- ${mode} <appUserId>`);
  const type = mode === 'refund' ? 'CANCELLATION' : 'NON_RENEWING_PURCHASE';
  const r = await sendWebhook(event(type, appUserId, `test_tx_${appUserId}`));
  console.log(r.status, r.body);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
