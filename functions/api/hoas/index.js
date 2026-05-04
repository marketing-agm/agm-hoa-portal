import { requireAdmin, sha256Hex } from "../../_lib/auth.js";
import { json, badRequest, unauthorized, SLUG_RE } from "../../_lib/http.js";
import { listHoas, getHoaBySlug, publicHoa } from "../../_lib/db.js";

export async function onRequestGet({ request, env }) {
  const isAdmin = await requireAdmin(request, env);
  if (!isAdmin) return unauthorized();
  const rows = await listHoas(env);
  return json({ hoas: rows.map(publicHoa) });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }

  const {
    id,
    name,
    full_name,
    street,
    city,
    era,
    manager_email,
    manager_phone,
    board_email,
    appfolio_base,
    resident_password,
    board_password,
    hero_image_key,
  } = body || {};

  if (!id || !SLUG_RE.test(id)) return badRequest("Invalid slug");
  if (!name || !full_name || !manager_email) {
    return badRequest("name, full_name, and manager_email are required");
  }
  if (!resident_password || resident_password.length < 4) {
    return badRequest("Resident password must be at least 4 characters");
  }
  if (!board_password || board_password.length < 4) {
    return badRequest("Board password must be at least 4 characters");
  }

  const existing = await getHoaBySlug(env, id);
  if (existing) return badRequest("An HOA with that slug already exists");

  const residentHash = await sha256Hex(resident_password);
  const boardHash = await sha256Hex(board_password);

  await env.DB.prepare(
    `INSERT INTO hoas (
      id, name, full_name, street, city, era,
      manager_email, manager_phone, board_email, appfolio_base,
      hero_image_key, resident_password_hash, board_password_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      name,
      full_name,
      street || null,
      city || null,
      era || null,
      manager_email,
      manager_phone || null,
      board_email || null,
      appfolio_base || null,
      hero_image_key || null,
      residentHash,
      boardHash
    )
    .run();

  const created = await getHoaBySlug(env, id);
  return json({ hoa: publicHoa(created) }, { status: 201 });
}
