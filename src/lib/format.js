// Convert API document rows into the legacy "file" shape the resident UI
// already speaks: { name, date, size }.
export function formatBytes(n) {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function shapeFile(doc) {
  return {
    id: doc.id,
    name: doc.name,
    date: (doc.uploaded_at || "").replace(" ", "T"),
    size: formatBytes(doc.size_bytes),
  };
}

// Group documents by folder and merge into folder rows.
export function shapeFolders(folders, documents) {
  const byFolder = new Map();
  for (const d of documents) {
    if (!byFolder.has(d.folder_id)) byFolder.set(d.folder_id, []);
    byFolder.get(d.folder_id).push(shapeFile(d));
  }
  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    scope: f.scope,
    narrative: f.narrative || "",
    files: byFolder.get(f.id) || [],
  }));
}

// API event rows → legacy event shape.
export function shapeEvent(e) {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    date: (e.starts_at || "").replace(" ", "T"),
    duration: e.duration,
    location: e.location,
    scope: e.scope,
    note: e.note,
  };
}
