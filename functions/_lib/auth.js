// Cookie-based auth helpers using HMAC-signed tokens (no JWT lib needed).

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes) {
  let s = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const s = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64urlEncode(sig);
}

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signSession(env, payload, ttlSeconds) {
  const claims = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = b64urlEncode(enc.encode(JSON.stringify(claims)));
  const sig = await hmac(env.SESSION_SECRET, body);
  return `${body}.${sig}`;
}

export async function verifySession(env, token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = await hmac(env.SESSION_SECRET, body);
  if (expected !== sig) return null;
  let claims;
  try {
    claims = JSON.parse(dec.decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  if (typeof claims.exp !== "number" || claims.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return claims;
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const out = {};
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(v.join("="));
  }
  return out;
}

export function setCookie(
  name,
  value,
  { maxAge, sameSite = "Lax", path = "/", partitioned = false } = {}
) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `HttpOnly`,
    `Secure`,
    `SameSite=${sameSite}`,
  ];
  if (maxAge) parts.push(`Max-Age=${maxAge}`);
  if (partitioned) parts.push("Partitioned");
  return parts.join("; ");
}

export function clearCookie(name, { path = "/", sameSite = "Lax", partitioned = false } = {}) {
  const parts = [
    `${name}=`,
    `Path=${path}`,
    `HttpOnly`,
    `Secure`,
    `Max-Age=0`,
    `SameSite=${sameSite}`,
  ];
  if (partitioned) parts.push("Partitioned");
  return parts.join("; ");
}

export const ADMIN_COOKIE = "agmadmin";
export const RESIDENT_COOKIE_PREFIX = "agmres_";
export const BOARD_COOKIE_PREFIX = "agmboard_";

export const ADMIN_TTL = 12 * 60 * 60;            // 12 hours
export const RESIDENT_TTL = 7 * 24 * 60 * 60;     // 7 days
export const BOARD_TTL = 24 * 60 * 60;            // 24 hours

export async function requireAdmin(request, env) {
  const cookies = parseCookies(request);
  const claims = await verifySession(env, cookies[ADMIN_COOKIE]);
  if (!claims || claims.role !== "admin") return null;
  return claims;
}

export async function requireResident(request, env, slug) {
  const cookies = parseCookies(request);
  const claims = await verifySession(env, cookies[RESIDENT_COOKIE_PREFIX + slug]);
  if (!claims || claims.slug !== slug) return null;
  return claims;
}

export async function requireBoard(request, env, slug) {
  const cookies = parseCookies(request);
  const claims = await verifySession(env, cookies[BOARD_COOKIE_PREFIX + slug]);
  if (!claims || claims.slug !== slug) return null;
  return claims;
}
