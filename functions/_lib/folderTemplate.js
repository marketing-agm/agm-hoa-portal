// Canonical folder taxonomy used by every HOA. New HOAs get these auto-seeded
// at creation; existing ones can backfill via the "Seed default folders"
// button in the admin Documents panel. Folders are still editable/deletable
// — this is just the starting point.

export const FOLDER_TEMPLATE = [
  // Board materials (restricted)
  {
    name: "Board Packet",
    scope: "board",
    narrative: "The dossier circulated before each monthly meeting — treasurer's report, manager's update, motions on the floor.",
  },
  {
    name: "Board Packet — Archive",
    scope: "board",
    narrative: "Every packet from prior meetings, kept in case anyone asks what was decided last March.",
  },
  {
    name: "Financials",
    scope: "board",
    narrative: "Monthly P&L, reserve activity, and delinquency report. The treasurer reviews each before distribution.",
  },
  {
    name: "Financial — Archive",
    scope: "board",
    narrative: "Past fiscal years, kept for audit and continuity.",
  },

  // Community library (all residents)
  {
    name: "Budget — Ratified",
    scope: "all",
    narrative: "The operating budget approved at the annual meeting. Dues for the year ahead are calculated against this.",
  },
  {
    name: "Community Communications & Notices",
    scope: "all",
    narrative: "Anything formally announced to the building — newsletters, gate code changes, policy reminders.",
  },
  {
    name: "Financial — Homeowners Packet",
    scope: "all",
    narrative: "The resident-facing summary of monthly finances. Less detail than the board version, same numbers.",
  },
  {
    name: "Homeowners Packet — Archive",
    scope: "all",
    narrative: "Past resident financial summaries, year by year.",
  },
  {
    name: "Governing Documents",
    scope: "all",
    narrative: "The constitution of the building — CC&Rs, Bylaws, Articles, and Rules. Most disputes are settled by something in here.",
  },
  {
    name: "Inspections",
    scope: "all",
    narrative: "Independent assessments — roof, foundation, life-safety. Read these before any major capital decision.",
  },
  {
    name: "Insurance",
    scope: "all",
    narrative: "Master policy and certificates. Lenders and prospective buyers ask for these constantly.",
  },
  {
    name: "Meeting Minutes — Archive",
    scope: "all",
    narrative: "Years of building decisions, indexed by date. The single best record of what the board has actually done.",
  },
  {
    name: "Minutes — Annual Meetings",
    scope: "all",
    narrative: "What was said and decided at each year's homeowner gathering — quorum, board elections, motions from the floor.",
  },
  {
    name: "Minutes — Board of Directors",
    scope: "all",
    narrative: "Recent monthly board minutes. Open sessions only — closed-session minutes stay confidential.",
  },
  {
    name: "Minutes — BOD Archives",
    scope: "all",
    narrative: "Older board minutes, compiled by year for easier reference.",
  },
  {
    name: "Reserve Study",
    scope: "all",
    narrative: "The thirty-year forecast for major systems — roof, plumbing, exterior. Updated every five years.",
  },
  {
    name: "Roof Maintenance",
    scope: "all",
    narrative: "Care plan, repairs, and warranty for the roof — the building's single most expensive long-term asset.",
  },
];

// Insert any template folders that don't already exist for this HOA (matched
// by name). Returns the number of folders inserted.
export async function seedFoldersForHoa(env, hoaId) {
  const existing = await env.DB.prepare(
    "SELECT name FROM folders WHERE hoa_id = ?"
  )
    .bind(hoaId)
    .all();
  const existingNames = new Set((existing.results || []).map((r) => r.name));

  let inserted = 0;
  for (let i = 0; i < FOLDER_TEMPLATE.length; i++) {
    const t = FOLDER_TEMPLATE[i];
    if (existingNames.has(t.name)) continue;
    const id = `${hoaId}:${crypto.randomUUID()}`;
    await env.DB.prepare(
      `INSERT INTO folders (id, hoa_id, name, scope, narrative, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, hoaId, t.name, t.scope, t.narrative, i)
      .run();
    inserted++;
  }
  return inserted;
}
