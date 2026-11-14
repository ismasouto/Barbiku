// Panel interno (§7.9): avanzar la chapa o marcar el árbol plantado (solo interno).
// Body: { id: string, chapa_status?: 'grabando' | 'enviado', tree_planted?: true }
import { adminClient, checkAdmin, corsHeaders, json } from '../_shared/common.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!checkAdmin(req)) return json({ error: 'unauthorized' }, 401);

  let body: { id?: unknown; chapa_status?: unknown; tree_planted?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (typeof body.id !== 'string' || !UUID_RE.test(body.id)) {
    return json({ error: 'invalid_id' }, 400);
  }
  const patch: Record<string, unknown> = {};
  if (body.chapa_status !== undefined) {
    if (body.chapa_status !== 'grabando' && body.chapa_status !== 'enviado') {
      return json({ error: 'invalid_chapa_status' }, 400);
    }
    patch.chapa_status = body.chapa_status;
  }
  if (body.tree_planted !== undefined) {
    if (body.tree_planted !== true) return json({ error: 'invalid_tree_planted' }, 400);
    patch.tree_planted = true;
  }
  if (Object.keys(patch).length === 0) return json({ error: 'empty_patch' }, 400);

  const db = adminClient();
  const { data, error } = await db
    .from('refloresta_orders')
    .update(patch)
    .eq('id', body.id)
    .eq('status', 'paid')
    .select('id');
  if (error) {
    console.error('[admin-update-order]', error);
    return json({ error: 'db_error' }, 500);
  }
  if (!data?.length) return json({ error: 'not_found' }, 404);
  return json({ ok: true });
});
