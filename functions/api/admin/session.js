import { requireAdmin } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  const claims = await requireAdmin(request, env);
  return json({ admin: !!claims });
}
