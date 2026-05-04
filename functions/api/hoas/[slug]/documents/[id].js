import { requireAdmin, requireResident, requireBoard } from "../../../../_lib/auth.js";
import { json, unauthorized, notFound } from "../../../../_lib/http.js";

export async function onRequestGet({ params, request, env }) {
  const { slug, id } = params;
  const doc = await env.DB.prepare(
    `SELECT d.*, f.scope AS folder_scope FROM documents d
     JOIN folders f ON f.id = d.folder_id
     WHERE d.id = ? AND d.hoa_id = ?`
  )
    .bind(id, slug)
    .first();
  if (!doc) return notFound();

  const isAdmin = await requireAdmin(request, env);
  const isResident = await requireResident(request, env, slug);
  const isBoard = await requireBoard(request, env, slug);

  if (!isAdmin) {
    if (!isResident) return unauthorized();
    if (doc.folder_scope === "board" && !isBoard) return unauthorized();
  }

  const obj = await env.DOCS.get(doc.r2_key);
  if (!obj) return notFound("File missing");

  const headers = new Headers();
  if (doc.content_type) headers.set("Content-Type", doc.content_type);
  const url = new URL(request.url);
  const disposition = url.searchParams.get("download") ? "attachment" : "inline";
  headers.set("Content-Disposition", `${disposition}; filename="${doc.name.replace(/"/g, "")}"`);
  if (doc.size_bytes) headers.set("Content-Length", String(doc.size_bytes));
  return new Response(obj.body, { headers });
}

export async function onRequestDelete({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const { slug, id } = params;
  const doc = await env.DB.prepare(
    "SELECT r2_key FROM documents WHERE id = ? AND hoa_id = ?"
  )
    .bind(id, slug)
    .first();
  if (!doc) return notFound();
  await env.DOCS.delete(doc.r2_key);
  await env.DB.prepare("DELETE FROM documents WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
