// Thin fetch wrapper. Cookies are handled automatically by the browser.

async function handle(res) {
  const ct = res.headers.get("Content-Type") || "";
  const isJson = ct.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : null;
  if (!res.ok) {
    const err = new Error((data && data.error) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function apiGet(path) {
  const res = await fetch(path, { credentials: "same-origin" });
  return handle(res);
}

export async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function apiPut(path, body) {
  const res = await fetch(path, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return handle(res);
}

export async function apiDelete(path) {
  const res = await fetch(path, {
    method: "DELETE",
    credentials: "same-origin",
  });
  return handle(res);
}

export async function apiUpload(path, formData) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
  });
  return handle(res);
}
