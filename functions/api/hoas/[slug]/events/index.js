import { requireAdmin, requireResident, requireBoard } from "../../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound } from "../../../../_lib/http.js";
import { getHoaBySlug } from "../../../../_lib/db.js";
import { uuid } from "../../../../_lib/http.js";

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
    ? "SELECT * FROM events WHERE hoa_id = ? ORDER BY starts_at"
    : "SELECT * FROM events WHERE hoa_id = ? AND scope = 'all' ORDER BY starts_at";
  const res = await env.DB.prepare(sql).bind(slug).all();
  return json({ events: res.results || [] });
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

  const { title, type, starts_at, duration, location, scope, note } = body || {};
  if (!title || !starts_at || !scope) {
    return badRequest("title, starts_at, scope required");
  }
  if (scope !== "all" && scope !== "board") return badRequest("scope must be all|board");

  const id = uuid();
  await env.DB.prepare(
    `INSERT INTO events (id, hoa_id, title, type, starts_at, duration, location, scope, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, slug, title, type || null, starts_at, duration || null, location || null, scope, note || null)
    .run();

  const created = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first();
  return json({ event: created }, { status: 201 });
}
