-- Multi-tenant HOA portal schema (Cloudflare D1)

CREATE TABLE IF NOT EXISTS hoas (
  id TEXT PRIMARY KEY,                      -- slug, e.g. 'queenscourt'
  name TEXT NOT NULL,                       -- 'Queens Court'
  full_name TEXT NOT NULL,                  -- 'Queens Court Condominiums'
  street TEXT,
  city TEXT,
  era TEXT,                                 -- 'Lower Queen Anne · Est. 1931'
  hero_image_key TEXT,                      -- R2 key for hero photo (or null = use default)
  manager_email TEXT NOT NULL,
  manager_phone TEXT,
  board_email TEXT,
  appfolio_base TEXT,
  resident_password_hash TEXT NOT NULL,     -- sha-256 hex
  board_password_hash TEXT NOT NULL,        -- sha-256 hex
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,                      -- '<hoa_id>:<slug>'
  hoa_id TEXT NOT NULL REFERENCES hoas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope TEXT NOT NULL,                      -- 'all' | 'board'
  narrative TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_folders_hoa ON folders(hoa_id, sort_order);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  hoa_id TEXT NOT NULL REFERENCES hoas(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size_bytes INTEGER,
  content_type TEXT,
  r2_key TEXT NOT NULL,                     -- '<hoa_id>/documents/<uuid>'
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_hoa ON documents(hoa_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  hoa_id TEXT NOT NULL REFERENCES hoas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT,
  starts_at TEXT NOT NULL,                  -- ISO 8601
  duration TEXT,
  location TEXT,
  scope TEXT NOT NULL,                      -- 'all' | 'board'
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_hoa ON events(hoa_id, starts_at);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  hoa_id TEXT NOT NULL REFERENCES hoas(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,                  -- 'maintenance' | 'architectural' | 'contact'
  payload_json TEXT NOT NULL,
  message_preview TEXT,
  submitter_name TEXT,
  submitter_email TEXT,
  submitter_unit TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_submissions_hoa ON submissions(hoa_id, created_at DESC);
