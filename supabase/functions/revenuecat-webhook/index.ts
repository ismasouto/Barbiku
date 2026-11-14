// Webhook de RevenueCat → marca pedidos de Refloresta como pagados / reembolsados (§10).
//
// RevenueCat envía: POST { api_version, event: { id, type, app_user_id,
//   original_app_user_id, aliases, product_id, entitlement_ids, transaction_id, ... } }
// con la cabecera Authorization con el valor LITERAL configurado en el dashboard
// (sin prefijo "Bearer" añadido); se compara exacta con el secret RC_WEBHOOK_AUTH.
//
// Siempre respondemos 200 cuando el evento se procesa o se descarta a propósito,
// para que RevenueCat no reintente sin fin. 401 si la cabecera no coincide;
// 500 solo ante errores de base de datos (RevenueCat reintentará).
import { adminClient, json, safeEqual } from '../_shared/common.ts';

// `refloresta_mascota`: consumible (una compra por mascota). `refloresta_unico` y `refloresta`
// son productos anteriores ya archivados; se aceptan por si llegan eventos atrasados.
const PRODUCT_IDS = ['refloresta_mascota', 'refloresta_unico', 'refloresta'];
const ENTITLEMENT_ID = 'refloresta';

// Tipos de evento (verificados con la documentación de RevenueCat):
// - compra única: NON_RENEWING_PURCHASE (INITIAL_PURCHASE por si acaso).
// - reembolso: no existe tipo REFUND; llega CANCELLATION (cancel_reason
//   CUSTOMER_SUPPORT, precio negativo). Cualquier CANCELLATION del producto → refunded.
// - cualquier otro tipo (incluido TEST) se guarda en webhook_events y se responde 200.
const PURCHASE_TYPES = new Set(['NON_RENEWING_PURCHASE', 'INITIAL_PURCHASE']);
const REFUND_TYPES = new Set(['CANCELLATION']);

interface RCEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  aliases?: string[];
  product_id?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  transaction_id?: string | null;
  original_transaction_id?: string | null;
  cancel_reason?: string | null;
  /** metadata[...] del Web Purchase Link. La app manda metadata[order_id]. */
  metadata?: Record<string, unknown> | null;
}

function metadataOrderId(ev: RCEvent): string | null {
  const v = ev.metadata?.order_id;
  return typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null;
}

function isRefloresta(ev: RCEvent): boolean {
  if (ev.product_id && PRODUCT_IDS.includes(ev.product_id)) return true;
  if (ev.entitlement_id === ENTITLEMENT_ID) return true;
  return Array.isArray(ev.entitlement_ids) && ev.entitlement_ids.includes(ENTITLEMENT_ID);
}

/** Todos los ids con los que puede estar guardado el pedido. */
function userIds(ev: RCEvent): string[] {
  const ids = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? [])];
  return [...new Set(ids.filter((x): x is string => typeof x === 'string' && x.length > 0))];
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // 1. Autorización
  // Tolerante a despistes al configurar: ignora espacios y un prefijo "Bearer " opcional.
  const expected = Deno.env.get('RC_WEBHOOK_AUTH')?.trim();
  const given = (req.headers.get('authorization') ?? '').trim().replace(/^Bearer\s+/i, '');
  if (!expected || !safeEqual(given, expected)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload: { event?: RCEvent } & Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: true, ignored: 'invalid_json' });
  }
  const ev = payload?.event;
  if (!ev?.id || !ev.type) {
    console.warn('[rc-webhook] evento sin id/type, se descarta');
    return json({ ok: true, ignored: 'no_event' });
  }

  const db = adminClient();

  // 2. Idempotencia: registrar el evento; si ya existía, no hacer nada más.
  const { error: insErr } = await db
    .from('webhook_events')
    .insert({ id: ev.id, type: ev.type, payload });
  if (insErr) {
    if (insErr.code === '23505') {
      console.log(`[rc-webhook] evento duplicado ${ev.id}, ignorado`);
      return json({ ok: true, duplicate: true });
    }
    console.error('[rc-webhook] error guardando evento', insErr);
    return json({ error: 'db_error' }, 500);
  }

  if (!isRefloresta(ev)) {
    return json({ ok: true, ignored: 'other_product' });
  }

  const ids = userIds(ev);

  // 3. Compra → paid
  if (PURCHASE_TYPES.has(ev.type)) {
    if (ev.transaction_id) {
      const { data: already } = await db
        .from('refloresta_orders')
        .select('id')
        .eq('rc_transaction_id', ev.transaction_id)
        .maybeSingle();
      if (already) return json({ ok: true, already_paid: already.id });
    }

    // Preferimos el pedido exacto que la app mandó en metadata[order_id] (una compra por mascota);
    // si no viene, el pendiente más reciente de ese usuario.
    const metaId = metadataOrderId(ev);
    let query = db
      .from('refloresta_orders')
      .select('id')
      .in('app_user_id', ids)
      .eq('status', 'pending_payment');
    if (metaId) query = query.eq('id', metaId);
    const { data: order, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[rc-webhook] error buscando pedido', error);
      return json({ error: 'db_error' }, 500);
    }
    if (!order) {
      console.warn(`[rc-webhook] compra sin pedido pendiente (users=${ids.join(',')}, event=${ev.id})`);
      return json({ ok: true, warning: 'no_pending_order' });
    }

    const { error: updErr } = await db
      .from('refloresta_orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        rc_transaction_id: ev.transaction_id ?? null,
      })
      .eq('id', order.id);
    if (updErr) {
      // 23505: esa mascota ya tenía un pedido pagado (one_paid_order_per_pet)
      // o transacción repetida. Lo dejamos registrado y no reintentamos.
      if (updErr.code === '23505') {
        console.warn(`[rc-webhook] conflicto de unicidad al pagar ${order.id}`, updErr.message);
        return json({ ok: true, warning: 'unique_conflict' });
      }
      console.error('[rc-webhook] error actualizando pedido', updErr);
      return json({ error: 'db_error' }, 500);
    }
    console.log(`[rc-webhook] pedido ${order.id} → paid`);
    return json({ ok: true, order_id: order.id, status: 'paid' });
  }

  // 4. Reembolso / cancelación → refunded
  if (REFUND_TYPES.has(ev.type)) {
    let orderId: string | null = null;
    const txIds = [ev.transaction_id, ev.original_transaction_id].filter(
      (x): x is string => typeof x === 'string' && x.length > 0,
    );
    if (txIds.length) {
      const { data } = await db
        .from('refloresta_orders')
        .select('id')
        .in('rc_transaction_id', txIds)
        .limit(1)
        .maybeSingle();
      orderId = data?.id ?? null;
    }
    if (!orderId) {
      const { data } = await db
        .from('refloresta_orders')
        .select('id')
        .in('app_user_id', ids)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      orderId = data?.id ?? null;
    }
    if (!orderId) {
      console.warn(`[rc-webhook] reembolso sin pedido pagado (event=${ev.id})`);
      return json({ ok: true, warning: 'no_paid_order' });
    }
    const { error } = await db.from('refloresta_orders').update({ status: 'refunded' }).eq('id', orderId);
    if (error) {
      console.error('[rc-webhook] error marcando reembolso', error);
      return json({ error: 'db_error' }, 500);
    }
    console.log(`[rc-webhook] pedido ${orderId} → refunded (${ev.type}, ${ev.cancel_reason ?? '-'})`);
    return json({ ok: true, order_id: orderId, status: 'refunded' });
  }

  return json({ ok: true, ignored: `type_${ev.type}` });
});
