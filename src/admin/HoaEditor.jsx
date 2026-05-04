import { useState, useEffect } from "react";
import { apiPost, apiPut, apiUpload } from "../lib/api.js";

const SLUG_RE = /^[a-z][a-z0-9-]{1,62}$/;

export default function HoaEditor({ hoa, onSaved, onCancel }) {
  const isNew = !hoa;
  const [form, setForm] = useState(() => ({
    id: hoa?.id || "",
    name: hoa?.name || "",
    full_name: hoa?.full_name || "",
    street: hoa?.street || "",
    city: hoa?.city || "",
    era: hoa?.era || "",
    manager_email: hoa?.manager_email || "",
    manager_phone: hoa?.manager_phone || "",
    board_email: hoa?.board_email || "",
    appfolio_base: hoa?.appfolio_base || "",
    resident_password: "",
    board_password: "",
  }));
  const [heroFile, setHeroFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (isNew && !SLUG_RE.test(form.id)) {
      setError("Slug must be lowercase letters, digits, and hyphens (start with a letter).");
      return;
    }
    setBusy(true);
    try {
      let saved;
      if (isNew) {
        const res = await apiPost("/api/hoas", form);
        saved = res.hoa;
      } else {
        const payload = { ...form };
        if (!payload.resident_password) delete payload.resident_password;
        if (!payload.board_password) delete payload.board_password;
        delete payload.id;
        const res = await apiPut(`/api/hoas/${hoa.id}`, payload);
        saved = res.hoa;
      }
      if (heroFile) {
        const fd = new FormData();
        fd.append("file", heroFile);
        await apiUpload(`/api/hoas/${saved.id}/hero`, fd);
      }
      onSaved(saved);
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="a-card" onSubmit={submit}>
      <h2>{isNew ? "Create HOA" : `Edit ${hoa.name}`}</h2>

      {isNew && (
        <div className="a-field">
          <label>URL slug</label>
          <input
            className="a-input"
            value={form.id}
            onChange={set("id")}
            placeholder="queenscourt"
            autoFocus
          />
          <div className="a-help">Residents will visit /{form.id || "<slug>"}.</div>
        </div>
      )}

      <div className="a-grid-2">
        <div className="a-field">
          <label>Display name</label>
          <input className="a-input" value={form.name} onChange={set("name")} placeholder="Queens Court" required />
        </div>
        <div className="a-field">
          <label>Full name</label>
          <input className="a-input" value={form.full_name} onChange={set("full_name")} placeholder="Queens Court Condominiums" required />
        </div>
      </div>

      <div className="a-grid-2">
        <div className="a-field">
          <label>Street</label>
          <input className="a-input" value={form.street} onChange={set("street")} placeholder="124 Warren Ave N" />
        </div>
        <div className="a-field">
          <label>City</label>
          <input className="a-input" value={form.city} onChange={set("city")} placeholder="Seattle, WA 98109" />
        </div>
      </div>

      <div className="a-field">
        <label>Era / tagline</label>
        <input className="a-input" value={form.era} onChange={set("era")} placeholder="Lower Queen Anne · Est. 1931" />
      </div>

      <div className="a-grid-2">
        <div className="a-field">
          <label>Manager email (receives form submissions)</label>
          <input className="a-input" type="email" value={form.manager_email} onChange={set("manager_email")} required />
        </div>
        <div className="a-field">
          <label>Manager phone</label>
          <input className="a-input" value={form.manager_phone} onChange={set("manager_phone")} />
        </div>
      </div>

      <div className="a-field">
        <label>Board email (optional — receives board-routed contact submissions)</label>
        <input className="a-input" type="email" value={form.board_email} onChange={set("board_email")} />
      </div>

      <div className="a-field">
        <label>AppFolio Connect base URL (optional)</label>
        <input className="a-input" value={form.appfolio_base} onChange={set("appfolio_base")} placeholder="https://agmrealestategroup.appfolio.com/connect" />
      </div>

      <div className="a-grid-2">
        <div className="a-field">
          <label>Resident password {!isNew && <span className="a-help" style={{ display: "inline" }}>(leave blank to keep current)</span>}</label>
          <input className="a-input" type="password" value={form.resident_password} onChange={set("resident_password")} required={isNew} />
        </div>
        <div className="a-field">
          <label>Board password {!isNew && <span className="a-help" style={{ display: "inline" }}>(leave blank to keep current)</span>}</label>
          <input className="a-input" type="password" value={form.board_password} onChange={set("board_password")} required={isNew} />
        </div>
      </div>

      <div className="a-field">
        <label>Hero image (optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setHeroFile(e.target.files?.[0] || null)}
        />
      </div>

      {error && <div className="a-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="a-btn a-btn-primary" disabled={busy}>
          {busy ? "Saving…" : isNew ? "Create HOA" : "Save changes"}
        </button>
        <button type="button" className="a-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
