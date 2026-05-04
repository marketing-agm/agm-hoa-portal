import { requireAdmin } from "../../../../_lib/auth.js";
import { json, unauthorized, notFound } from "../../../../_lib/http.js";
import { getHoaBySlug } from "../../../../_lib/db.js";
import { seedFoldersForHoa } from "../../../../_lib/folderTemplate.js";

// POST /api/hoas/<slug>/folders/seed — inserts any template folders this HOA
// is missing (matched by name). Safe to call repeatedly; existing folders
// are left untouched.
export async function onRequestPost({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound();
  const inserted = await seedFoldersForHoa(env, slug);
  return json({ ok: true, inserted });
}
