import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api.js";

function emptyEvent() {
  return { title: "", type: "", starts_at: "", duration: "", location: "", scope: "all", note: "" };
}

export default function EventsPanel({ slug }) {
  const [events, setEvents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyEvent());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await apiGet(`/api/hoas/${slug}/events`);
      setEvents(res.events || []);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, [slug]);

  const startNew = () => { setEditing("new"); setForm(emptyEvent()); };
  const startEdit = (ev) => {
    setEditing(ev.id);
    setForm({
      title: ev.title || "",
      type: ev.type || "",
      starts_at: (ev.starts_at || "").slice(0, 16).replace(" ", "T"),
      duration: ev.duration || "",
      location: ev.location || "",
      scope: ev.scope || "all",
      note: ev.note || "",
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const payload = { ...form, starts_at: form.starts_at };
      if (editing === "new") {
        await apiPost(`/api/hoas/${slug}/events`, payload);
      } else {
        await apiPut(`/api/hoas/${slug}/events/${editing}`, payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this event?")) return;
    await apiDelete(`/api/hoas/${slug}/events/${id}`);
    await load();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Events</h2>
        {!editing && <button className="a-btn a-btn-primary" onClick={startNew}>+ New event</button>}
      </div>

      {editing && (
        <form className="a-card" onSubmit={submit}>
          <h3>{editing === "new" ? "New event" : "Edit event"}</h3>
          <div className="a-field">
            <label>Title</label>
            <input className="a-input" value={form.title} onChange={set("title")} required />
          </div>
          <div className="a-grid-3">
            <div className="a-field">
              <label>Type</label>
              <input className="a-input" value={form.type} onChange={set("type")} placeholder="Open Session" />
            </div>
            <div className="a-field">
              <label>Starts at</label>
              <input type="datetime-local" className="a-input" value={form.starts_at} onChange={set("starts_at")} required />
            </div>
            <div className="a-field">
              <label>Duration</label>
              <input className="a-input" value={form.duration} onChange={set("duration")} placeholder="2 hrs" />
            </div>
          </div>
          <div className="a-grid-2">
            <div className="a-field">
              <label>Location</label>
              <input className="a-input" value={form.location} onChange={set("location")} />
            </div>
            <div className="a-field">
              <label>Scope</label>
              <select className="a-input" value={form.scope} onChange={set("scope")}>
                <option value="all">All residents</option>
                <option value="board">Board only</option>
              </select>
            </div>
          </div>
          <div className="a-field">
            <label>Note</label>
            <textarea className="a-textarea" value={form.note} onChange={set("note")} rows={3} />
          </div>
          {error && <div className="a-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="a-btn a-btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button className="a-btn" type="button" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {events.length === 0 && !editing && <div className="a-empty">No events yet.</div>}

      {events.map((ev) => (
        <div className="a-row" key={ev.id}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>{ev.title}</div>
            <div className="a-row-meta">
              {new Date(ev.starts_at).toLocaleString()} · {ev.location || "—"} · {ev.scope === "board" ? "Board only" : "All residents"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="a-btn" onClick={() => startEdit(ev)}>Edit</button>
            <button className="a-btn a-btn-danger" onClick={() => remove(ev.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
