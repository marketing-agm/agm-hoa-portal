import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "../lib/api.js";

function emptyFolder() {
  return { name: "", scope: "all", narrative: "" };
}

export default function DocumentsPanel({ slug }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderForm, setFolderForm] = useState(emptyFolder());
  const [uploadFor, setUploadFor] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const [fo, do_] = await Promise.all([
        apiGet(`/api/hoas/${slug}/folders`),
        apiGet(`/api/hoas/${slug}/documents`),
      ]);
      setFolders(fo.folders || []);
      setDocuments(do_.documents || []);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, [slug]);

  const docsByFolder = documents.reduce((acc, d) => {
    (acc[d.folder_id] ||= []).push(d);
    return acc;
  }, {});

  const startNewFolder = () => { setEditingFolder("new"); setFolderForm(emptyFolder()); };
  const startEditFolder = (f) => {
    setEditingFolder(f.id);
    setFolderForm({ name: f.name, scope: f.scope, narrative: f.narrative || "" });
  };

  const submitFolder = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (editingFolder === "new") {
        await apiPost(`/api/hoas/${slug}/folders`, folderForm);
      } else {
        await apiPut(`/api/hoas/${slug}/folders/${editingFolder}`, folderForm);
      }
      setEditingFolder(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteFolder = async (id) => {
    if (!confirm("Delete this folder and ALL its documents?")) return;
    await apiDelete(`/api/hoas/${slug}/folders/${id}`);
    await load();
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadFor) return;
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("folder_id", uploadFor);
      fd.append("name", uploadFile.name);
      await apiUpload(`/api/hoas/${slug}/documents/upload`, fd);
      setUploadFile(null);
      setUploadFor(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteDoc = async (id) => {
    if (!confirm("Delete this document?")) return;
    await apiDelete(`/api/hoas/${slug}/documents/${id}`);
    await load();
  };

  const setF = (k) => (e) => setFolderForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Documents</h2>
        {!editingFolder && <button className="a-btn a-btn-primary" onClick={startNewFolder}>+ New folder</button>}
      </div>

      {editingFolder && (
        <form className="a-card" onSubmit={submitFolder}>
          <h3>{editingFolder === "new" ? "New folder" : "Edit folder"}</h3>
          <div className="a-grid-2">
            <div className="a-field">
              <label>Name</label>
              <input className="a-input" value={folderForm.name} onChange={setF("name")} required />
            </div>
            <div className="a-field">
              <label>Scope</label>
              <select className="a-input" value={folderForm.scope} onChange={setF("scope")}>
                <option value="all">All residents</option>
                <option value="board">Board only</option>
              </select>
            </div>
          </div>
          <div className="a-field">
            <label>Narrative (one or two sentences shown above the file list)</label>
            <textarea className="a-textarea" value={folderForm.narrative} onChange={setF("narrative")} rows={2} />
          </div>
          {error && <div className="a-error" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="a-btn a-btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
            <button className="a-btn" type="button" onClick={() => setEditingFolder(null)}>Cancel</button>
          </div>
        </form>
      )}

      {folders.length === 0 && !editingFolder && <div className="a-empty">No folders yet.</div>}

      {folders.map((f) => (
        <details className="a-card" key={f.id} style={{ marginBottom: 12 }}>
          <summary style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontWeight: 500 }}>{f.name}</span>
              <span className="a-pill" style={{ marginLeft: 10 }}>
                {f.scope === "board" ? "Board only" : "All residents"}
              </span>
              <span className="a-row-meta" style={{ marginLeft: 10 }}>
                {(docsByFolder[f.id] || []).length} files
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.preventDefault()}>
              <button className="a-btn" onClick={() => { setUploadFor(f.id); setUploadFile(null); }}>Upload</button>
              <button className="a-btn" onClick={() => startEditFolder(f)}>Edit</button>
              <button className="a-btn a-btn-danger" onClick={() => deleteFolder(f.id)}>Delete</button>
            </div>
          </summary>

          {uploadFor === f.id && (
            <form onSubmit={submitUpload} style={{ marginTop: 14, padding: 12, border: "1px solid var(--a-border)", borderRadius: 8 }}>
              <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
              <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                <button className="a-btn a-btn-primary" type="submit" disabled={!uploadFile || busy}>
                  {busy ? "Uploading…" : "Upload"}
                </button>
                <button className="a-btn" type="button" onClick={() => { setUploadFor(null); setUploadFile(null); }}>Cancel</button>
              </div>
            </form>
          )}

          <div style={{ marginTop: 12 }}>
            {(docsByFolder[f.id] || []).map((d) => (
              <div className="a-row" key={d.id} style={{ marginBottom: 6 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{d.name}</div>
                  <div className="a-row-meta">
                    {new Date(d.uploaded_at).toLocaleString()}
                    {d.size_bytes ? ` · ${(d.size_bytes / 1024).toFixed(0)} KB` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <a className="a-btn" href={`/api/hoas/${slug}/documents/${d.id}`} target="_blank" rel="noreferrer">View</a>
                  <button className="a-btn a-btn-danger" onClick={() => deleteDoc(d.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
