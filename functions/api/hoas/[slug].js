import { requireAdmin, sha256Hex } from "../../_lib/auth.js";
import { json, badRequest, notFound, unauthorized } from "../../_lib/http.js";
import { getHoaBySlug, publicHoa } from "../../_lib/db.js";

// Public: returns branding-only fields (no email/phone/passwords).
export async function onRequestGet({ params, env, request }) {
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound("HOA not found");

  // If admin, return everything (minus password hashes).
  const isAdmin = await requireAdmin(request, env);
  if (isAdmin) return json({ hoa: publicHoa(hoa) });

  // Public response: only the branding the resident UI needs.
  return json({
    hoa: {
      id: hoa.id,
      name: hoa.name,
      full_name: hoa.full_name,
      street: hoa.street,
      city: hoa.city,
      era: hoa.era,
      hero_image_key: hoa.hero_image_key,
      appfolio_base: hoa.appfolio_base,
    },
  });
}

export async function onRequestPut({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const slug = params.slug;
  const existing = await getHoaBySlug(env, slug);
  if (!existing) return notFound("HOA not found");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const fields = [
    "name",
    "full_name",
    "street",
    "city",
    "era",
    "manager_email",
    "manager_phone",
    "board_email",
    "appfolio_base",
    "hero_image_key",
  ];
  const updates = [];
  const values = [];
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      updates.push(`${f} = ?`);
      values.push(body[f] ?? null);
    }
  }

  if (body.resident_password) {
    if (body.resident_password.length < 4) return badRequest("Resident password too short");
    updates.push("resident_password_hash = ?");
    values.push(await sha256Hex(body.resident_password));
  }
  if (body.board_password) {
    if (body.board_password.length < 4) return badRequest("Board password too short");
    updates.push("board_password_hash = ?");
    values.push(await sha256Hex(body.board_password));
  }

  if (updates.length === 0) return badRequest("No updates");

  values.push(slug);
  await env.DB.prepare(`UPDATE hoas SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await getHoaBySlug(env, slug);
  return json({ hoa: publicHoa(updated) });
}

export async function onRequestDelete({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const slug = params.slug;
  const existing = await getHoaBySlug(env, slug);
  if (!existing) return notFound("HOA not found");

  // Empty the R2 prefix for this HOA before deleting the row.
  // R2 list+delete in batches (best-effort; cascade handles D1 rows).
  let cursor;
  do {
    const list = await env.DOCS.list({ prefix: `${slug}/`, cursor, limit: 1000 });
    cursor = list.truncated ? list.cursor : undefined;
    if (list.objects.length > 0) {
      await env.DOCS.delete(list.objects.map((o) => o.key));
    }
  } while (cursor);

  await env.DB.prepare("DELETE FROM hoas WHERE id = ?").bind(slug).run();
  return json({ ok: true });
}
