import { useEffect, useState } from "react";
import { apiGet } from "../lib/api.js";

const FORM_LABELS = {
  maintenance: "Maintenance",
  architectural: "Architectural",
  contact: "Contact",
};

export default function SubmissionsPanel({ slug }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet(`/api/hoas/${slug}/submissions`);
        if (!cancelled) setItems(res.submissions || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div>
      <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600 }}>Submissions</h2>
      {error && <div className="a-error">{error}</div>}
      {items.length === 0 && <div className="a-empty">No submissions yet.</div>}
      {items.map((s) => {
        let payload = {};
        try { payload = JSON.parse(s.payload_json); } catch { /* */ }
        return (
          <details className="a-card" key={s.id} style={{ marginBottom: 10 }}>
            <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="a-pill">{FORM_LABELS[s.form_type] || s.form_type}</span>
                <span style={{ marginLeft: 10, fontWeight: 500 }}>
                  {s.message_preview || "(no preview)"}
                </span>
              </div>
              <span className="a-row-meta">{new Date(s.created_at).toLocaleString()}</span>
            </summary>
            <div style={{ marginTop: 14 }}>
              {s.submitter_unit && <div className="a-row-meta">Unit {s.submitter_unit}</div>}
              <pre style={{ marginTop: 10, fontSize: 12, color: "var(--a-text-2)", whiteSpace: "pre-wrap", overflowX: "auto" }}>
                {JSON.stringify(payload, null, 2)}
              </pre>
            </div>
          </details>
        );
      })}
    </div>
  );
}
