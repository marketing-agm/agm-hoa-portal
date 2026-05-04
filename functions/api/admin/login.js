import { sha256Hex, signSession, setCookie, ADMIN_COOKIE, ADMIN_TTL } from "../../_lib/auth.js";
import { json, badRequest, unauthorized } from "../../_lib/http.js";

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON");
  }
  const password = body?.password;
  if (!password) return badRequest("Password required");
  if (!env.ADMIN_PASS_HASH) return unauthorized("Admin not configured");

  const hash = await sha256Hex(password);
  if (hash !== env.ADMIN_PASS_HASH) return unauthorized("Invalid password");

  const token = await signSession(env, { role: "admin" }, ADMIN_TTL);
  return json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": setCookie(ADMIN_COOKIE, token, {
          maxAge: ADMIN_TTL,
          sameSite: "Strict",
        }),
      },
    }
  );
}
