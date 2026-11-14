// Panel interno (§7.9): lista de pedidos pagados + totales.
// Protegido por la cabecera x-admin-passcode (= secret ADMIN_PASSCODE).
import { adminClient, checkAdmin, corsHeaders, json } from '../_shared/common.ts';

const NET_PER_TREE = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!checkAdmin(req)) return json({ error: 'unauthorized' }, 401);

  const db = adminClient();
  const { data, error } = await db
    .from('refloresta_orders')
    .select(
      'id, pet_name, pet_species, engraving_text, ship_name, ship_street, ship_postal_code, ship_city, ship_province, chapa_status, tree_planted, created_at, paid_at, amount_net_refloresta',
    )
    .eq('status', 'paid')
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('[admin-orders]', error);
    return json({ error: 'db_error' }, 500);
  }

  const rows = data ?? [];
  const eurosRefloresta = rows.reduce(
    (sum, o) => sum + (Number(o.amount_net_refloresta) || NET_PER_TREE),
    0,
  );
  const orders = rows.map(({ amount_net_refloresta: _n, ...o }) => o);

  return json({
    orders,
    totals: { treesFunded: rows.length, eurosRefloresta: Math.round(eurosRefloresta * 100) / 100 },
  });
});
