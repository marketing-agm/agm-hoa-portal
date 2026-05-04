import { requireAdmin, requireResident, requireBoard } from "../../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound, uuid } from "../../../../_lib/http.js";
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
    ? `SELECT f.*, COUNT(d.id) AS file_count, MAX(d.uploaded_at) AS last_uploaded_at
       FROM folders f LEFT JOIN documents d ON d.folder_id = f.id
       WHERE f.hoa_id = ? GROUP BY f.id ORDER BY f.sort_order, f.name`
    : `SELECT f.*, COUNT(d.id) AS file_count, MAX(d.uploaded_at) AS last_uploaded_at
       FROM folders f LEFT JOIN documents d ON d.folder_id = f.id
       WHERE f.hoa_id = ? AND f.scope = 'all' GROUP BY f.id ORDER BY f.sort_order, f.name`;
  const res = await env.DB.prepare(sql).bind(slug).all();
  return json({ folders: res.results || [] });
}

export async function onRequestPost({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const { name, scope, narrative, sort_order } = body || {};
  if (!name || !scope) return badRequest("name and scope required");
  if (scope !== "all" && scope !== "board") return badRequest("scope must be all|board");

  const id = `${slug}:${uuid()}`;
  await env.DB.prepare(
    `INSERT INTO folders (id, hoa_id, name, scope, narrative, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, slug, name, scope, narrative || null, sort_order ?? 0)
    .run();

  const created = await env.DB.prepare("SELECT * FROM folders WHERE id = ?").bind(id).first();
  return json({ folder: { ...created, file_count: 0, last_uploaded_at: null } }, { status: 201 });
}
