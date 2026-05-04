import { requireAdmin } from "../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound } from "../../../_lib/http.js";
import { getHoaBySlug } from "../../../_lib/db.js";

// GET serves the hero image (publicly).
export async function onRequestGet({ params, env }) {
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa || !hoa.hero_image_key) return notFound();
  const obj = await env.DOCS.get(hoa.hero_image_key);
  if (!obj) return notFound();
  const headers = new Headers();
  const ct = obj.httpMetadata?.contentType || "image/webp";
  headers.set("Content-Type", ct);
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(obj.body, { headers });
}

// POST replaces the hero image (admin only).
export async function onRequestPost({ params, request, env }) {
  if (!(await requireAdmin(request, env))) return unauthorized();
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound();

  const form = await request.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return badRequest("file required");

  const ext = (file.type || "").split("/")[1] || "bin";
  const key = `_hoa_assets/${slug}/hero.${ext}`;
  await env.DOCS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });
  await env.DB.prepare("UPDATE hoas SET hero_image_key = ? WHERE id = ?")
    .bind(key, slug)
    .run();
  return json({ ok: true, hero_image_key: key });
}
