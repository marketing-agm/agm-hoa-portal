import { requireAdmin } from "../../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound } from "../../../../_lib/http.js";

export async function onRequestPut({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const { slug, id } = params;
  const existing = await env.DB.prepare("SELECT * FROM events WHERE id = ? AND hoa_id = ?")
    .bind(id, slug)
    .first();
  if (!existing) return notFound();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const fields = ["title", "type", "starts_at", "duration", "location", "scope", "note"];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      updates.push(`${f} = ?`);
      values.push(body[f] ?? null);
    }
  }
  if (updates.length === 0) return badRequest("No updates");
  values.push(id);
  await env.DB.prepare(`UPDATE events SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  const updated = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first();
  return json({ event: updated });
}

export async function onRequestDelete({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const { slug, id } = params;
  const res = await env.DB.prepare("DELETE FROM events WHERE id = ? AND hoa_id = ?")
    .bind(id, slug)
    .run();
  if (res.meta?.changes === 0) return notFound();
  return json({ ok: true });
}
