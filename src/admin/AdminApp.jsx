import { useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "../lib/api.js";
import { ADMIN_CSS } from "./adminStyles.js";
import AdminLogin from "./AdminLogin.jsx";
import HoaEditor from "./HoaEditor.jsx";
import EventsPanel from "./EventsPanel.jsx";
import DocumentsPanel from "./DocumentsPanel.jsx";
import SubmissionsPanel from "./SubmissionsPanel.jsx";

const STORAGE_KEY = "agm_admin_current_hoa";
const TABS = [
  { id: "events", label: "Events" },
  { id: "documents", label: "Documents" },
  { id: "submissions", label: "Submissions" },
  { id: "settings", label: "HOA Settings" },
];

export default function AdminApp() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [hoas, setHoas] = useState([]);
  const [currentSlug, setCurrentSlug] = useState(null);
  const [tab, setTab] = useState("events");
  const [creatingHoa, setCreatingHoa] = useState(false);

  // Frame-bust: admin must never load inside an iframe.
  useEffect(() => {
    if (window.top !== window.self) {
      try { window.top.location = window.self.location; } catch { /* */ }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet("/api/admin/session");
        if (!cancelled) setAuthed(!!res.admin);
      } catch { /* */ } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadHoas = async () => {
    const res = await apiGet("/api/hoas");
    setHoas(res.hoas || []);
    return res.hoas || [];
  };

  useEffect(() => {
    if (!authed) return;
    (async () => {
      const list = await loadHoas();
      const stored = localStorage.getItem(STORAGE_KEY);
      const initial = list.find((h) => h.id === stored) || list[0];
      if (initial) setCurrentSlug(initial.id);
      else setCreatingHoa(true);
    })();
  }, [authed]);

  const switchHoa = (slug) => {
    setCurrentSlug(slug);
    setCreatingHoa(false);
    setTab("events");
    try { localStorage.setItem(STORAGE_KEY, slug); } catch { /* */ }
  };

  const logout = async () => {
    await apiPost("/api/admin/logout", {});
    setAuthed(false);
    setHoas([]);
    setCurrentSlug(null);
  };

  const onHoaSaved = async (saved) => {
    const list = await loadHoas();
    if (saved?.id) switchHoa(saved.id);
    else if (list.length > 0) switchHoa(list[0].id);
  };

  const deleteCurrentHoa = async () => {
    if (!currentSlug) return;
    const name = hoas.find((h) => h.id === currentSlug)?.name || currentSlug;
    const typed = prompt(`Type "${currentSlug}" to permanently delete ${name} and all its data:`);
    if (typed !== currentSlug) return;
    await apiDelete(`/api/hoas/${currentSlug}`);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* */ }
    const list = await loadHoas();
    setCurrentSlug(list[0]?.id || null);
    setCreatingHoa(list.length === 0);
  };

  if (!authChecked) {
    return <div className="a-shell"><style>{ADMIN_CSS}</style></div>;
  }
  if (!authed) {
    return (
      <div className="a-shell">
        <style>{ADMIN_CSS}</style>
        <AdminLogin onAuth={() => setAuthed(true)} />
      </div>
    );
  }

  const currentHoa = hoas.find((h) => h.id === currentSlug);

  return (
    <div className="a-shell">
      <style>{ADMIN_CSS}</style>

      <div className="a-bar">
        <div>
          <div className="a-bar-eyebrow">AGM Admin</div>
          <div className="a-bar-brand">{currentHoa ? currentHoa.name : "No HOA selected"}</div>
        </div>
        <div className="a-bar-spacer" />
        {hoas.length > 0 && (
          <select
            className="a-select"
            value={currentSlug || ""}
            onChange={(e) => switchHoa(e.target.value)}
          >
            {hoas.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        )}
        <button className="a-btn" onClick={() => setCreatingHoa(true)}>+ New HOA</button>
        <button className="a-btn" onClick={logout}>Sign out</button>
      </div>

      <div className="a-body">
        {creatingHoa && (
          <HoaEditor
            hoa={null}
            onSaved={(saved) => { setCreatingHoa(false); onHoaSaved(saved); }}
            onCancel={() => setCreatingHoa(false)}
          />
        )}

        {!creatingHoa && currentHoa && (
          <>
            <div className="a-tabs">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={`a-tab${tab === t.id ? " is-active" : ""}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "events" && <EventsPanel slug={currentSlug} />}
            {tab === "documents" && <DocumentsPanel slug={currentSlug} />}
            {tab === "submissions" && <SubmissionsPanel slug={currentSlug} />}
            {tab === "settings" && (
              <>
                <HoaEditor hoa={currentHoa} onSaved={onHoaSaved} onCancel={() => setTab("events")} />
                <div className="a-card" style={{ borderColor: "rgba(229,108,92,0.3)" }}>
                  <h3 style={{ color: "var(--a-danger)" }}>Danger zone</h3>
                  <p className="a-row-meta" style={{ marginBottom: 12 }}>
                    Deleting an HOA permanently removes its events, documents, and submissions.
                  </p>
                  <button className="a-btn a-btn-danger" onClick={deleteCurrentHoa}>
                    Delete this HOA
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {!creatingHoa && !currentHoa && hoas.length === 0 && (
          <div className="a-empty">
            No HOAs yet. <button className="a-btn a-btn-primary" onClick={() => setCreatingHoa(true)}>Create your first HOA</button>
          </div>
        )}
      </div>
    </div>
  );
}
