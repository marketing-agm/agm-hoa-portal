import {
  sha256Hex,
  signSession,
  setCookie,
  clearCookie,
  BOARD_COOKIE_PREFIX,
  BOARD_TTL,
  requireResident,
} from "../../../../_lib/auth.js";
import { json, badRequest, unauthorized, notFound } from "../../../../_lib/http.js";
import { getHoaBySlug } from "../../../../_lib/db.js";

export async function onRequestPost({ params, request, env }) {
  const slug = params.slug;
  const hoa = await getHoaBySlug(env, slug);
  if (!hoa) return notFound("HOA not found");

  // Resident must already be authed before unlocking board materials.
  if (!(await requireResident(request, env, slug))) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const password = body?.password;
  if (!password) return badRequest("Password required");

  const hash = await sha256Hex(password);
  if (hash !== hoa.board_password_hash) return unauthorized("Invalid password");

  const token = await signSession(env, { slug, role: "board" }, BOARD_TTL);
  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": setCookie(BOARD_COOKIE_PREFIX + slug, token, {
          maxAge: BOARD_TTL,
          sameSite: "Lax",
        }),
      },
    }
  );
}

export async function onRequestDelete({ params }) {
  return json(
    { ok: true },
    { headers: { "Set-Cookie": clearCookie(BOARD_COOKIE_PREFIX + params.slug) } }
  );
}
