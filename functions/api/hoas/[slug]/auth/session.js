import { requireResident, requireBoard } from "../../../../_lib/auth.js";
import { json } from "../../../../_lib/http.js";

export async function onRequestGet({ params, request, env }) {
  const slug = params.slug;
  const resident = await requireResident(request, env, slug);
  const board = await requireBoard(request, env, slug);
  return json({ resident: !!resident, board: !!board });
}
