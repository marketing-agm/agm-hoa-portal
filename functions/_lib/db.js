export async function getHoaBySlug(env, slug) {
  return env.DB.prepare("SELECT * FROM hoas WHERE id = ?").bind(slug).first();
}

export async function listHoas(env) {
  const res = await env.DB.prepare(
    "SELECT id, name, full_name, street, city, era, manager_email, board_email, appfolio_base, hero_image_key, created_at FROM hoas ORDER BY name"
  ).all();
  return res.results || [];
}

// Strip secrets (password hashes) before returning to client.
export function publicHoa(row) {
  if (!row) return null;
  const {
    resident_password_hash,
    board_password_hash,
    ...safe
  } = row;
  return safe;
}
