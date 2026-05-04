import { requireAdmin } from "../../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound } from "../../../../_lib/http.js";

export async function onRequestPut({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const { slug, id } = params;
  const existing = await env.DB.prepare("SELECT * FROM folders WHERE id = ? AND hoa_id = ?")
    .bind(id, slug)
    .first();
  if (!existing) return notFound();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const fields = ["name", "scope", "narrative", "sort_order"];
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
  await env.DB.prepare(`UPDATE folders SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  const updated = await env.DB.prepare("SELECT * FROM folders WHERE id = ?").bind(id).first();
  return json({ folder: updated });
}

export async function onRequestDelete({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const { slug, id } = params;

  // Find docs in this folder, delete from R2, then delete DB rows.
  const docs = await env.DB.prepare(
    "SELECT r2_key FROM documents WHERE folder_id = ? AND hoa_id = ?"
  )
    .bind(id, slug)
    .all();
  const keys = (docs.results || []).map((r) => r.r2_key);
  if (keys.length > 0) await env.DOCS.delete(keys);

  const res = await env.DB.prepare("DELETE FROM folders WHERE id = ? AND hoa_id = ?")
    .bind(id, slug)
    .run();
  if (res.meta?.changes === 0) return notFound();
  return json({ ok: true });
}
