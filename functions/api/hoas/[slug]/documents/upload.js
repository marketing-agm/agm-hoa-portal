import { requireAdmin } from "../../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound, uuid } from "../../../../_lib/http.js";
import { getHoaBySlug } from "../../../../_lib/db.js";

export async function onRequestPost({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound();

  const form = await request.formData();
  const file = form.get("file");
  const folder_id = form.get("folder_id");
  const name = (form.get("name") || file?.name || "").toString();
  if (!file || typeof file === "string") return badRequest("file required");
  if (!folder_id) return badRequest("folder_id required");

  const folder = await env.DB.prepare(
    "SELECT id FROM folders WHERE id = ? AND hoa_id = ?"
  )
    .bind(folder_id, slug)
    .first();
  if (!folder) return notFound("Folder not found");

  const id = uuid();
  const r2_key = `${slug}/documents/${id}`;
  await env.DOCS.put(r2_key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  await env.DB.prepare(
    `INSERT INTO documents (id, hoa_id, folder_id, name, size_bytes, content_type, r2_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, slug, folder_id, name, file.size || null, file.type || null, r2_key)
    .run();

  const created = await env.DB.prepare("SELECT * FROM documents WHERE id = ?").bind(id).first();
  return json({ document: created }, { status: 201 });
}
