import {
  sha256Hex,
  signSession,
  setCookie,
  clearCookie,
  RESIDENT_COOKIE_PREFIX,
  RESIDENT_TTL,
} from "../../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound } from "../../../../_lib/http.js";
import { getHoaBySlug } from "../../../../_lib/db.js";

export async function onRequestPost({ params, request, env }) {
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound("HOA not found");

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const password = body?.password;
  if (!password) return badRequest("Password required");

  const hash = await sha256Hex(password);
  if (hash !== hoa.resident_password_hash) return unauthorized("Invalid password");

  const token = await signSession(env, { slug, role: "resident" }, RESIDENT_TTL);
  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": setCookie(RESIDENT_COOKIE_PREFIX + slug, token, {
          maxAge: RESIDENT_TTL,
          sameSite: "Lax",
        }),
      },
    }
  );
}

export async function onRequestDelete({ params }) {
  return json(
    { ok: true },
    { headers: { "Set-Cookie": clearCookie(RESIDENT_COOKIE_PREFIX + params.slug) } }
  );
}
