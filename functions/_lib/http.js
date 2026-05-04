export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function notFound(message = "Not found") {
  return json({ error: message }, { status: 404 });
}
export function unauthorized(message = "Unauthorized") {
  return json({ error: message }, { status: 401 });
}
export function badRequest(message = "Bad request") {
  return json({ error: message }, { status: 400 });
}
export function serverError(message = "Server error") {
  return json({ error: message }, { status: 500 });
}

export function uuid() {
  return crypto.randomUUID();
}

export const SLUG_RE = /^[a-z][a-z0-9-]{1,62}$/;
