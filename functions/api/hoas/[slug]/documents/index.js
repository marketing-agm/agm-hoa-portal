import { requireAdmin, requireResident, requireBoard } from "../../../../_lib/auth.js";
import { json, unauthorized, notFound } from "../../../../_lib/http.js";
import { getHoaBySlug } from "../../../../_lib/db.js";

export async function onRequestGet({ params, request, env }) {
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound();

  const isAdmin = await requireAdmin(request, env);
  const isResident = await requireResident(request, env, slug);
  const isBoard = await requireBoard(request, env, slug);
  if (!isAdmin && !isResident) return unauthorized();
  const showBoard = isAdmin || isBoard;

  const sql = showBoard
    ? `SELECT d.*, f.scope AS folder_scope FROM documents d
       JOIN folders f ON f.id = d.folder_id
       WHERE d.hoa_id = ? ORDER BY d.uploaded_at DESC`
    : `SELECT d.*, f.scope AS folder_scope FROM documents d
       JOIN folders f ON f.id = d.folder_id
       WHERE d.hoa_id = ? AND f.scope = 'all' ORDER BY d.uploaded_at DESC`;

  const res = await env.DB.prepare(sql).bind(slug).all();
  return json({ documents: res.results || [] });
}
