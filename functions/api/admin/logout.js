import { clearCookie, ADMIN_COOKIE } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestPost() {
  return json({ ok: true }, { headers: { "Set-Cookie": clearCookie(ADMIN_COOKIE) } });
}
