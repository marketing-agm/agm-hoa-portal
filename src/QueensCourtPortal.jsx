import { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Download,
  Lock,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  X,
  FileText,
  LogOut,
  ArrowUpRight,
  CheckSquare,
  Wrench,
  Shield,
  PencilRuler,
  Building2,
  UserCircle,
  Clock,
  MapPin,
  LayoutList,
  LayoutGrid,
  Copy,
  Check,
  Send,
  Info,
} from "lucide-react";
import { HoaProvider, useHoa } from "./lib/hoaContext.jsx";
import { apiGet, apiPost, apiDelete } from "./lib/api.js";
import { shapeFolders, shapeEvent } from "./lib/format.js";
import {
  generateMaintenanceMessage,
  generateArchitecturalMessage,
  generateContactEmail,
} from "./shared/messages.js";

// ─────────────────────────────────────────────────────────────────
//  STATIC FORM SCHEMAS (not tenant-specific — shape of the inputs)
// ─────────────────────────────────────────────────────────────────

const MAINTENANCE_CATEGORIES = [
  { id: "plumbing", label: "Plumbing or water", sub: "Leaks, drainage, pressure" },
  { id: "electrical", label: "Electrical or lights", sub: "Outlets, fixtures, breakers" },
  { id: "hvac", label: "Heating, cooling, vents", sub: "HVAC, air quality" },
  { id: "security", label: "Doors, gates, security", sub: "Locks, intercom, fobs" },
  { id: "common", label: "Hallways, lobby, elevators", sub: "Common-area issues" },
  { id: "exterior", label: "Exterior or grounds", sub: "Roof, siding, landscaping" },
  { id: "other", label: "Something else", sub: "Not sure where it fits" },
];

const MAINTENANCE_DURATIONS = [
  { id: "just-now", label: "Just noticed it" },
  { id: "today", label: "Started today" },
  { id: "few-days", label: "A few days" },
  { id: "over-week", label: "Over a week" },
];

const MAINTENANCE_URGENCIES = [
  { id: "routine", label: "Routine", sub: "No rush" },
  { id: "inconvenient", label: "Inconvenient", sub: "But manageable" },
  { id: "disrupting", label: "Disrupting", sub: "Affects daily life" },
  { id: "urgent", label: "Urgent", sub: "Water, gas, security" },
];

const ARC_PROJECT_TYPES = [
  { id: "windows-doors", label: "Windows or doors", sub: "Replace, refinish, modify" },
  { id: "flooring", label: "Flooring", sub: "Hard surfaces, anything not carpet" },
  { id: "paint-finish", label: "Paint or finishes", sub: "Visible from outside the unit" },
  { id: "balcony-patio", label: "Balcony or patio", sub: "Screens, planters, structures" },
  { id: "plumbing-electrical", label: "Plumbing or electrical", sub: "Work that needs a permit" },
  { id: "hvac", label: "HVAC modifications", sub: "New units, vent changes" },
  { id: "structural", label: "Structural", sub: "Walls, ceilings, load-bearing" },
  { id: "other", label: "Something else", sub: "Not sure where it fits" },
];

const ARC_CONTRACTOR_TYPES = [
  { id: "licensed", label: "Licensed contractor" },
  { id: "diy", label: "Self or DIY" },
  { id: "undecided", label: "Not yet decided" },
];

const ARC_DURATIONS = [
  { id: "under-week", label: "Less than a week" },
  { id: "1-2-weeks", label: "1 to 2 weeks" },
  { id: "2-4-weeks", label: "2 to 4 weeks" },
  { id: "over-month", label: "Over a month" },
];

const CONTACT_CATEGORIES = [
  { id: "billing", label: "Billing & Assessments", sub: "Payments, dues, special assessments", recipient: "manager" },
  { id: "noise", label: "Noise or Nuisance", sub: "Disturbances, odors, disruptive behavior", recipient: "board" },
  { id: "parking", label: "Parking", sub: "Assigned spots, violations, guest parking", recipient: "board" },
  { id: "move", label: "Move-In or Move-Out", sub: "Scheduling, elevator, key handoff", recipient: "manager" },
  { id: "amenity", label: "Amenity Reservation", sub: "Common rooms, rooftop, gym, guest suites", recipient: "manager" },
  { id: "rule-violation", label: "Rule Violation Report", sub: "Policy breaches, unauthorized changes, pet violations", recipient: "board" },
  { id: "general", label: "General Inquiry", sub: "Board meetings, community updates, other questions", recipient: "board" },
];

const CONTACT_REPLY_PREFS = [
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "either", label: "Either is fine" },
];

// ─────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────

function formatDateShort(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatTableDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  if (d.getFullYear() === now.getFullYear()) {
    return `${month} ${d.getDate()}`;
  }
  return `${month} ’${String(d.getFullYear()).slice(-2)}`;
}
function formatMonth(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}
function formatDay(iso) {
  return String(new Date(iso).getDate()).padStart(2, "0");
}
function formatWeekday(iso) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function lastUpdated(folder) {
  if (!folder.files || folder.files.length === 0) return new Date(0).toISOString();
  const dates = folder.files.map((f) => new Date(f.date).getTime());
  return new Date(Math.max(...dates)).toISOString();
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function buildMonthGrid(monthDate) {
  // Returns an array of Date objects for the calendar grid (full weeks Sun→Sat)
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - firstOfMonth.getDay()); // back to Sunday
  const end = new Date(lastOfMonth);
  end.setDate(end.getDate() + (6 - lastOfMonth.getDay())); // forward to Saturday
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// ─────────────────────────────────────────────────────────────────
//  THEME
// ─────────────────────────────────────────────────────────────────

const THEME_CSS = `
  @import url('https://rsms.me/inter/inter.css');

  :root {
    /* Warm neutral palette */
    --bg: #faf9f7;
    --surface: #ffffff;
    --surface-2: #f5f4f1;
    --border: #ececec;
    --border-mid: #d8d6d2;
    --border-strong: #1a1a1a;
    --hover: #f3f2ef;

    /* Text */
    --t1: #181818;
    --t2: #525252;
    --t3: #9a9a98;
    --t4: #d8d6d2;

    /* Accent (used very sparingly) */
    --ink: #181818;
    --ink-hover: #2a2a2a;

    /* Shadow */
    --shadow-sm: 0 1px 2px rgba(20, 20, 20, 0.04);
    --shadow-md: 0 4px 12px -2px rgba(20, 20, 20, 0.08), 0 2px 4px -1px rgba(20, 20, 20, 0.04);
    --shadow-lg: 0 24px 48px -12px rgba(20, 20, 20, 0.18), 0 8px 16px -4px rgba(20, 20, 20, 0.06);
  }

  * { box-sizing: border-box; }

  .qc-shell {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: var(--t1);
    background: var(--bg);
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "cv11", "ss01", "ss03";
  }
  @supports (font-variation-settings: normal) {
    .qc-shell { font-family: 'Inter var', system-ui, sans-serif; }
  }

  .qc-num {
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum", "ss01";
  }
  .qc-caps {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 11px;
    font-weight: 500;
  }
  .qc-caps-sm {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 10px;
    font-weight: 500;
  }

  /* Tags */
  .qc-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 9.5px;
    font-weight: 600;
    background: var(--ink);
    color: #fff;
    padding: 3px 7px;
    border-radius: 3px;
    line-height: 1;
  }
  .qc-tag-outline {
    display: inline-flex;
    align-items: center;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 9.5px;
    font-weight: 600;
    background: transparent;
    color: var(--t2);
    border: 1px solid var(--border-mid);
    padding: 2px 7px;
    border-radius: 3px;
    line-height: 1;
  }

  /* Hover row */
  .qc-row { transition: background-color 0.12s ease; }
  .qc-row:hover { background: var(--hover); }

  /* Search */
  .qc-search:focus-within {
    border-color: var(--ink) !important;
    box-shadow: 0 0 0 3px rgba(24, 24, 24, 0.06);
  }
  .qc-search input::placeholder { color: var(--t3); }

  /* Quick links bar (thin secondary nav) */
  .qc-quicklinks-bar { font-size: 13px; }
  .qc-quicklinks-bar::-webkit-scrollbar { height: 0; }

  .qc-quicklink {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px;
    border-radius: 5px;
    color: var(--t2);
    text-decoration: none;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 500;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background-color 0.12s ease, color 0.12s ease;
  }
  .qc-quicklink:hover {
    background: var(--hover);
    color: var(--t1);
  }
  .qc-quicklink:hover .qc-quicklink-arrow {
    color: var(--t1);
    transform: translate(1px, -1px);
  }
  .qc-quicklink-arrow {
    color: var(--t4);
    transition: color 0.12s ease, transform 0.12s ease;
    margin-left: 2px;
  }

  /* Splash login */
  .qc-splash {
    font-family: 'Inter', system-ui, sans-serif;
    color: var(--t1);
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "cv11", "ss01", "ss03";
    display: flex;
    align-items: stretch;
    justify-content: center;
  }
  @supports (font-variation-settings: normal) {
    .qc-splash { font-family: 'Inter var', system-ui, sans-serif; }
  }
  .qc-splash-frame {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
    width: 100%;
    min-height: 100vh;
  }

  /* Left — photo with overlay + bottom-anchored identity */
  .qc-splash-left {
    position: relative;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 56px 56px 32px;
    color: #fff;
  }
  .qc-splash-left-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(15, 16, 17, 0.55) 0%,
      rgba(15, 16, 17, 0.35) 30%,
      rgba(15, 16, 17, 0.55) 65%,
      rgba(15, 16, 17, 0.85) 100%
    );
    pointer-events: none;
  }
  .qc-splash-left-content {
    position: relative;
    z-index: 1;
    max-width: 520px;
    margin-bottom: 22px;
  }
  .qc-splash-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 22px;
  }
  .qc-splash-title {
    font-size: clamp(40px, 5vw, 60px);
    font-weight: 600;
    color: #fff;
    letter-spacing: -0.028em;
    line-height: 1;
    margin: 0 0 22px;
  }
  .qc-splash-address {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.85);
    line-height: 1.55;
    font-weight: 400;
  }
  .qc-splash-rule {
    width: 64px;
    height: 2px;
    background: #fff;
    margin: 26px 0 20px;
  }
  .qc-splash-era {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 500;
  }
  .qc-splash-foot {
    position: relative;
    z-index: 1;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 500;
  }

  /* Right — form, vertically centered */
  .qc-splash-right {
    background: var(--surface);
    padding: 56px 56px 40px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }
  .qc-splash-right-inner {
    width: 100%;
    max-width: 420px;
    margin-left: clamp(0px, 4vw, 56px);
  }
  .qc-splash-lede {
    font-size: 15px;
    color: var(--t2);
    line-height: 1.6;
    margin: 0 0 36px;
  }
  .qc-splash-form {
    margin-bottom: 36px;
  }
  .qc-splash-help {
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }

  @media (max-width: 860px) {
    .qc-splash-frame {
      grid-template-columns: 1fr !important;
    }
    .qc-splash-left {
      min-height: 320px !important;
      padding: 32px 28px 24px !important;
    }
    .qc-splash-right {
      padding: 36px 28px 40px !important;
    }
    .qc-splash-right-inner {
      margin-left: 0 !important;
    }
  }

  /* Top view switcher (Calendar / Documents tabs) */
  .qc-top-switcher {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    border-bottom: 1px solid var(--border);
    margin-bottom: 32px;
    gap: 16px;
    margin-top: 4px;
  }
  .qc-top-side {
    display: flex;
    align-items: flex-end;
    padding-bottom: 18px;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .qc-top-tabs {
    display: flex;
    gap: 0;
    flex-wrap: nowrap;
    min-width: 0;
  }
  .qc-top-tab {
    border: none;
    background: transparent;
    padding: 10px 14px 12px;
    margin-right: 32px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    border-radius: 10px;
    transition: background-color 0.18s ease;
    position: relative;
  }
  .qc-top-tab:first-child { margin-left: -14px; }
  .qc-top-tab:last-child { margin-right: 0; }
  .qc-top-tab:hover {
    background: var(--surface-2);
  }
  .qc-top-tab:hover .qc-top-tab-label {
    color: var(--t2);
  }
  .qc-top-tab.is-active {
    background: var(--surface-2);
  }
  .qc-top-tab-label {
    font-size: 18px;
    font-weight: 600;
    color: var(--t4);
    letter-spacing: -0.018em;
    line-height: 1.1;
    transition: color 0.18s ease;
  }
  .qc-top-tab.is-active .qc-top-tab-label,
  .qc-top-tab.is-active:hover .qc-top-tab-label {
    color: var(--t1);
  }
  .qc-top-tab-meta {
    font-size: 10px;
    color: var(--t3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 500;
    margin-top: 6px;
    transition: color 0.18s ease;
  }
  .qc-top-tab.is-active .qc-top-tab-meta {
    color: var(--t2);
  }

  /* Calendar — month grid */
  .qc-cal-arrows {
    display: flex;
    border: 1px solid var(--border-mid);
    border-radius: 6px;
    background: var(--surface);
    overflow: hidden;
  }
  .qc-cal-arrows button {
    border: none;
    background: transparent;
    padding: 7px 10px;
    cursor: pointer;
    color: var(--t2);
    display: flex;
    align-items: center;
    transition: color 0.12s ease, background 0.12s ease;
    font-family: inherit;
  }
  .qc-cal-arrows button:first-child {
    border-right: 1px solid var(--border);
  }
  .qc-cal-arrows button:hover {
    background: var(--hover);
    color: var(--t1);
  }

  .qc-cal-grid {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .qc-cal-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  .qc-cal-weekday {
    padding: 10px 12px;
    font-size: 10px;
    font-weight: 600;
    color: var(--t3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    text-align: left;
  }
  .qc-cal-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  }
  .qc-cal-day {
    min-height: 116px;
    padding: 8px 8px 6px;
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: var(--surface);
  }
  .qc-cal-day:nth-child(7n) { border-right: none; }
  .qc-cal-day:nth-last-child(-n+7) { border-bottom: none; }
  .qc-cal-day.is-other {
    background: var(--bg);
  }
  .qc-cal-day.is-other .qc-cal-day-num { color: var(--t4); }

  .qc-cal-day-num {
    font-size: 13px;
    font-weight: 500;
    color: var(--t2);
    line-height: 1;
    padding: 2px 2px 0;
    min-height: 22px;
  }
  .qc-cal-day-num-today {
    background: var(--ink);
    color: #fff;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 12px;
    margin: -3px 0 -3px -3px;
  }
  .qc-cal-day.is-today {
    background: var(--surface);
  }

  .qc-cal-day-events {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-height: 0;
  }
  .qc-cal-event {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 6px 3px 5px;
    background: var(--surface-2);
    border: none;
    border-left: 2px solid var(--t4);
    border-radius: 3px;
    font-family: inherit;
    font-size: 11px;
    font-weight: 500;
    color: var(--t1);
    cursor: pointer;
    text-align: left;
    transition: background 0.12s ease, border-color 0.12s ease;
    line-height: 1.35;
    min-width: 0;
    overflow: hidden;
  }
  .qc-cal-event:hover {
    background: var(--hover);
    border-left-color: var(--t2);
  }
  .qc-cal-event.is-board {
    border-left-color: var(--ink);
  }
  .qc-cal-event.is-board:hover { border-left-color: var(--ink); }
  .qc-cal-event-time {
    color: var(--t3);
    font-weight: 500;
    font-size: 10.5px;
    flex-shrink: 0;
  }
  .qc-cal-event-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  /* Folder rows (typographic table) */
  .qc-folder-list {
    /* Container is intentionally borderless — rows carry the dividers */
  }
  .qc-folder-row {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px 16px;
    align-items: start;
    gap: 28px;
    padding: 18px 14px;
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background-color 0.12s ease;
    position: relative;
  }
  .qc-folder-row + .qc-folder-row {
    border-top: 1px solid var(--border);
  }
  .qc-folder-row:hover { background: var(--hover); }
  .qc-folder-row.is-active {
    background: var(--surface-2);
  }
  .qc-folder-row.is-active::before {
    content: "";
    position: absolute;
    left: 0;
    top: 14px;
    bottom: 14px;
    width: 2px;
    background: var(--ink);
    border-radius: 1px;
  }
  .qc-folder-row:hover .qc-folder-arrow {
    color: var(--t1);
    transform: translateX(2px);
  }
  .qc-folder-content {
    min-width: 0;
  }
  .qc-folder-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--t1);
    line-height: 1.35;
    letter-spacing: -0.01em;
    margin: 0 0 4px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .qc-folder-narrative {
    font-size: 13.5px;
    color: var(--t2);
    line-height: 1.6;
    font-weight: 400;
    margin: 0;
    max-width: 88ch;
  }
  .qc-folder-updated {
    font-size: 11px;
    color: var(--t3);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    text-align: right;
    padding-top: 4px;
    white-space: nowrap;
  }
  .qc-folder-arrow {
    color: var(--t4);
    margin-top: 4px;
    transition: color 0.15s ease, transform 0.15s ease;
  }
  /* View toggle */
  .qc-view-toggle {
    display: inline-flex;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    padding: 2px;
    flex-shrink: 0;
  }
  .qc-view-toggle button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px 8px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    color: var(--t3);
    font-family: inherit;
    transition: background-color 0.12s ease, color 0.12s ease;
  }
  .qc-view-toggle button:hover:not(.is-active) {
    color: var(--t1);
    background: var(--hover);
  }
  .qc-view-toggle button.is-active {
    background: var(--ink);
    color: #fff;
  }

  /* Folder grid (cards) */
  .qc-folder-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 14px;
  }
  .qc-folder-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 24px 26px 22px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    box-shadow: none;
    min-height: 168px;
  }
  .qc-folder-card:hover {
    background: var(--hover);
    border-color: var(--border-mid);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .qc-folder-card.is-active {
    background: var(--hover);
    border-color: var(--ink);
    box-shadow: var(--shadow-md);
  }
  .qc-folder-card:hover .qc-folder-card-arrow,
  .qc-folder-card.is-active .qc-folder-card-arrow {
    color: var(--t1);
    opacity: 1;
    transform: translateX(2px);
  }
  .qc-folder-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .qc-folder-card-updated {
    font-size: 10px;
    color: var(--t3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 500;
    white-space: nowrap;
  }
  .qc-folder-card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--t1);
    line-height: 1.3;
    letter-spacing: -0.012em;
    margin: 6px 0 0;
  }
  .qc-folder-card-narrative {
    font-size: 13px;
    color: var(--t2);
    line-height: 1.6;
    margin: 0;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .qc-folder-card-arrow {
    color: var(--t4);
    opacity: 0.7;
    align-self: flex-end;
    transition: color 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
  }

  /* Folder detail (sub-page replacing the modal) */
  .qc-folder-detail { padding-top: 0; }
  .qc-folder-detail-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin: -2px 0 10px;
  }
  .qc-folder-detail-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    padding: 4px 8px 4px 6px;
    margin-left: -8px;
    color: var(--t2);
    font-family: inherit;
    font-size: 11.5px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 4px;
    transition: color 0.12s ease, background-color 0.12s ease;
  }
  .qc-folder-detail-back:hover { color: var(--t1); background: var(--hover); }
  .qc-folder-detail-topbar-meta {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .qc-folder-detail-header {
    padding-bottom: 16px;
    margin-bottom: 14px;
    display: flex;
    align-items: baseline;
    gap: 20px;
    flex-wrap: wrap;
  }
  .qc-folder-detail-title {
    font-size: 22px;
    font-weight: 600;
    color: var(--t1);
    line-height: 1.2;
    letter-spacing: -0.02em;
    margin: 0;
    flex-shrink: 0;
  }
  .qc-folder-detail-narrative {
    font-size: 13px;
    line-height: 1.5;
    color: var(--t2);
    margin: 0;
    flex: 1;
    min-width: 280px;
  }
  .qc-folder-detail-body {
    display: grid;
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
    gap: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    overflow: hidden;
    height: calc(100vh - 230px);
    min-height: 460px;
  }
  .qc-folder-detail-list {
    border-right: 1px solid var(--border);
    background: var(--bg);
    overflow-y: auto;
  }
  .qc-folder-detail-list-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 16px 18px 12px;
    border-bottom: 1px solid var(--border);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 10px;
    font-weight: 600;
    color: var(--t3);
  }
  .qc-folder-detail-list-item {
    width: 100%;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 18px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 0.12s ease;
    position: relative;
  }
  .qc-folder-detail-list-item:last-child { border-bottom: none; }
  .qc-folder-detail-list-item:hover { background: var(--hover); }
  .qc-folder-detail-list-item.is-active {
    background: var(--surface-2);
  }
  .qc-folder-detail-list-item.is-active::before {
    content: "";
    position: absolute;
    left: 0; top: 10px; bottom: 10px;
    width: 2px;
    background: var(--ink);
    border-radius: 1px;
  }
  .qc-folder-detail-list-icon {
    width: 26px;
    height: 26px;
    border-radius: 5px;
    background: var(--surface);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .qc-folder-detail-list-item.is-active .qc-folder-detail-list-icon {
    background: var(--ink);
    border-color: var(--ink);
    color: #fff;
  }
  .qc-folder-detail-list-text { min-width: 0; flex: 1; }
  .qc-folder-detail-list-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--t1);
    line-height: 1.35;
    margin-bottom: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .qc-folder-detail-list-meta {
    font-size: 10.5px;
    color: var(--t3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  .qc-folder-detail-preview {
    display: flex;
    flex-direction: column;
    background: var(--surface-2);
    min-width: 0;
  }
  .qc-folder-detail-preview-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 22px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
  }
  .qc-folder-detail-preview-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--t1);
    line-height: 1.3;
    margin-bottom: 2px;
  }
  .qc-folder-detail-preview-meta {
    font-size: 10.5px;
    color: var(--t3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 500;
  }
  .qc-folder-detail-preview-frame {
    flex: 1;
    padding: 24px;
    display: flex;
    align-items: stretch;
    justify-content: center;
    overflow-y: auto;
    min-height: 0;
  }
  .qc-doc-page {
    width: 100%;
    max-width: 720px;
    background: #fdfdfb;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 56px 72px 48px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
    color: #2a2a28;
    display: flex;
    flex-direction: column;
    align-self: flex-start;
  }
  .qc-doc-page-header {
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 9.5px;
    font-weight: 600;
    color: #8a8a85;
    padding-bottom: 12px;
    border-bottom: 1px solid #e5e3dc;
    margin-bottom: 22px;
  }
  .qc-doc-page-title {
    font-size: 20px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.015em;
    margin: 0 0 6px;
    color: #1a1a18;
  }
  .qc-doc-page-date {
    font-size: 10.5px;
    color: #8a8a85;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 500;
    margin-bottom: 22px;
  }
  .qc-doc-page-lines {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }
  .qc-doc-page-line {
    height: 7px;
    background: #ece9e0;
    border-radius: 2px;
  }
  .qc-doc-page-line.short { width: 62%; }
  .qc-doc-page-line.med { width: 84%; }
  .qc-doc-page-gap { height: 14px; }
  .qc-doc-page-foot {
    margin-top: 28px;
    padding-top: 14px;
    border-top: 1px solid #e5e3dc;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 9px;
    color: #b0aea7;
    display: flex;
    justify-content: space-between;
    font-weight: 500;
  }

  /* Maintenance form */
  .qc-form-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 48px;
    align-items: flex-start;
  }
  .qc-form-fields {
    min-width: 0;
  }
  .qc-form-aside {
    min-width: 0;
  }
  .qc-form-aside-sticky {
    position: sticky;
    top: 24px;
  }

  /* Stepper */
  .qc-stepper {
    display: flex;
    align-items: stretch;
    gap: 0;
    margin-bottom: 32px;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .qc-stepper::-webkit-scrollbar { display: none; }
  .qc-step {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 0 14px;
    margin-right: 32px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
    font-family: inherit;
    color: var(--t3);
    transition: color 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .qc-step:last-child { margin-right: 0; }
  .qc-step:hover { color: var(--t2); }
  .qc-step.is-complete { color: var(--t2); }
  .qc-step.is-complete .qc-step-num {
    background: var(--surface);
    border-color: var(--t2);
    color: var(--t2);
  }
  .qc-step.is-active {
    color: var(--t1);
    border-bottom-color: var(--ink);
  }
  .qc-step.is-active .qc-step-num {
    background: var(--ink);
    color: #fff;
    border-color: var(--ink);
  }
  .qc-step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid var(--border-mid);
    font-size: 10px;
    font-weight: 600;
    background: var(--surface);
    color: var(--t3);
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .qc-step-label {
    font-size: 13px;
    font-weight: 500;
    letter-spacing: -0.005em;
  }

  /* Step panel content area */
  .qc-step-panel {
    min-height: 280px;
  }

  /* Step nav buttons (bottom of form) */
  .qc-step-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid var(--border);
  }

  .qc-form-field {
    margin-bottom: 32px;
  }
  .qc-form-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--t1);
    letter-spacing: -0.005em;
    margin-bottom: 14px;
    line-height: 1.3;
  }
  .qc-input,
  .qc-textarea {
    width: 100%;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
    font-family: inherit;
    font-size: 13.5px;
    color: var(--t1);
    outline: none;
    transition: border-color 0.15s ease, background 0.15s ease;
  }
  .qc-input::placeholder,
  .qc-textarea::placeholder {
    color: var(--t3);
  }
  .qc-input:hover,
  .qc-textarea:hover {
    border-color: var(--border-mid);
  }
  .qc-input:focus,
  .qc-textarea:focus {
    border-color: var(--ink);
    background: var(--surface);
  }
  .qc-textarea {
    resize: vertical;
    min-height: 128px;
    line-height: 1.55;
  }

  /* Chip group (used for category, duration, urgency) */
  .qc-chip-group {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }
  .qc-chip {
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 20px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 5px;
    min-height: 68px;
    justify-content: center;
    transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  }
  .qc-chip:hover {
    background: var(--hover);
    border-color: var(--border-mid);
  }
  .qc-chip.is-active {
    background: var(--hover);
    border-color: var(--ink);
    box-shadow: 0 0 0 1px var(--ink);
  }
  .qc-chip-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--t1);
    letter-spacing: -0.005em;
    line-height: 1.3;
  }
  .qc-chip-sub {
    font-size: 12px;
    color: var(--t3);
    font-weight: 400;
    line-height: 1.4;
  }

  /* Generated message preview */
  .qc-preview {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 28px 30px 30px;
    margin-top: 12px;
  }
  .qc-preview-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 20px;
    gap: 12px;
  }
  .qc-preview-body {
    font-family: inherit;
    font-size: 14px;
    line-height: 1.65;
    color: var(--t1);
    white-space: pre-wrap;
    min-height: 140px;
  }
  .qc-preview-empty {
    color: var(--t3);
    font-weight: 400;
  }

  /* Inline help popover (replaces the long intro paragraphs) */
  .qc-help-pop {
    position: relative;
    margin-top: 14px;
  }
  .qc-help-pop-trigger {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 7px 14px 7px 12px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    color: var(--t2);
    cursor: pointer;
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  }
  .qc-help-pop-trigger:hover,
  .qc-help-pop.is-open .qc-help-pop-trigger {
    background: var(--hover);
    border-color: var(--border-mid);
    color: var(--t1);
  }
  .qc-help-pop-caret {
    transition: transform 0.15s ease;
    color: var(--t3);
  }
  .qc-help-pop.is-open .qc-help-pop-caret {
    transform: rotate(180deg);
    color: var(--t2);
  }
  .qc-help-pop-panel {
    position: absolute;
    top: calc(100% + 10px);
    left: 0;
    right: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 20px 22px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
    z-index: 20;
    animation: qcHelpPopIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .qc-help-pop-panel p {
    font-size: 13px;
    line-height: 1.6;
    color: var(--t2);
    margin: 0 0 10px;
  }
  .qc-help-pop-panel p:last-child { margin-bottom: 0; }
  @keyframes qcHelpPopIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Email preview rows (inside qc-preview) */
  .qc-email-row {
    display: flex;
    gap: 12px;
    font-size: 13.5px;
    margin-bottom: 6px;
    align-items: baseline;
  }
  .qc-email-label {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 10px;
    color: var(--t3);
    font-weight: 600;
    min-width: 56px;
    flex-shrink: 0;
  }
  .qc-email-value {
    color: var(--t1);
    flex: 1;
    word-break: break-word;
  }
  .qc-email-divider {
    height: 1px;
    background: var(--border);
    margin: 14px 0;
  }
  .qc-email-body {
    white-space: pre-wrap;
    font-size: 13.5px;
    color: var(--t1);
    line-height: 1.6;
  }

  /* Form actions */
  .qc-form-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
    align-items: center;
    flex-wrap: wrap;
  }
  .qc-btn:disabled,
  .qc-btn[disabled] {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .qc-btn-primary:disabled:hover {
    background: var(--ink);
  }

  /* Unlock prompt (shown at bottom of Documents when board mode is locked) */
  .qc-unlock-prompt {
    margin-top: 32px;
    padding: 18px 22px;
    border: 1px dashed var(--border-mid);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    background: transparent;
  }
  .qc-unlock-prompt-text {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13.5px;
    color: var(--t2);
    line-height: 1.5;
    min-width: 0;
  }

  /* Section header (collapsible) */
  .qc-section-head {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    align-items: baseline;
    gap: 16px;
    cursor: pointer;
    padding-bottom: 16px;
    margin-bottom: 16px;
    background: transparent;
    border: none;
    font-family: inherit;
    text-align: left;
    width: 100%;
  }
  .qc-section-head:hover .qc-section-toggle { color: var(--t1); }

  .qc-section-numeral {
    font-size: 11px;
    font-weight: 500;
    color: var(--t3);
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
    align-self: center;
  }
  .qc-section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--t1);
    letter-spacing: -0.015em;
    line-height: 1.3;
  }
  .qc-section-sub {
    font-size: 13px;
    color: var(--t2);
    margin-top: 4px;
    font-weight: 400;
  }
  .qc-section-toggle {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--t2);
    font-size: 11px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: color 0.15s ease;
    align-self: center;
  }

  /* Modal (centered) */
  .qc-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(20, 20, 20, 0.45);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    animation: qcOverlayFade 0.18s ease;
  }
  @keyframes qcOverlayFade { from { opacity: 0; } to { opacity: 1; } }

  .qc-modal {
    width: 100%;
    max-width: 620px;
    max-height: calc(100vh - 64px);
    background: var(--surface);
    border: 1px solid var(--border-mid);
    border-radius: 12px;
    z-index: 101;
    display: flex;
    flex-direction: column;
    animation: qcModalIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
  }
  @keyframes qcModalIn {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .qc-modal-body { overflow-y: auto; }
  .qc-modal-body::-webkit-scrollbar { width: 8px; }
  .qc-modal-body::-webkit-scrollbar-track { background: transparent; }
  .qc-modal-body::-webkit-scrollbar-thumb { background: var(--border-mid); border-radius: 4px; }

  /* Buttons */
  .qc-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .qc-btn-ghost {
    background: transparent;
    border: 1px solid var(--border-mid);
    color: var(--t1);
  }
  .qc-btn-ghost:hover {
    background: var(--surface-2);
    border-color: var(--t3);
  }
  .qc-btn-primary {
    background: var(--ink);
    border: 1px solid var(--ink);
    color: #fff;
  }
  .qc-btn-primary:hover { background: var(--ink-hover); }

  .qc-fade-in { animation: qcFade 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
  @keyframes qcFade {
    from { opacity: 0; transform: translateY(2px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 1100px) {
    .qc-form-grid {
      grid-template-columns: 1fr !important;
      gap: 32px !important;
    }
    .qc-form-aside-sticky {
      position: static !important;
    }
  }
  @media (max-width: 980px) {
    .qc-masthead { padding: 16px 24px !important; }
    .qc-quicklinks-bar { padding: 10px 24px !important; }
    .qc-body { padding: 24px !important; }
    .qc-section-head { grid-template-columns: 28px 1fr auto !important; gap: 12px !important; }
    .qc-cal-day { min-height: 90px !important; padding: 6px 5px !important; }
    .qc-cal-event-time { display: none; }
    .qc-cal-weekday { padding: 8px 6px !important; font-size: 9px !important; }
    .qc-top-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .qc-top-tabs::-webkit-scrollbar { display: none; }
    .qc-top-tab { margin-right: 24px !important; }
    .qc-top-tab-label { font-size: 16px !important; }
  }
  @media (max-width: 720px) {
    .qc-folder-row {
      grid-template-columns: minmax(0, 1fr) auto !important;
      gap: 16px !important;
    }
    .qc-folder-arrow { display: none !important; }
    .qc-folder-narrative { max-width: 100%; }
    .qc-folder-grid { grid-template-columns: 1fr !important; }
    .qc-cal-day { min-height: 70px !important; }
    .qc-cal-event-title { font-size: 10px !important; }
    .qc-folder-detail-body { grid-template-columns: 1fr !important; }
    .qc-folder-detail-list { max-height: none !important; border-right: none !important; border-bottom: 1px solid var(--border) !important; }
  }
`;

// ─────────────────────────────────────────────────────────────────
//  CALENDAR — MONTH GRID
// ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CalendarHeader({ currentMonth, onPrev, onNext, onToday, isCurrentMonthToday }) {
  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return (
    <div
      className="flex items-baseline justify-between"
      style={{ marginBottom: 16, gap: 16 }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--t1)",
          letterSpacing: "-0.022em",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        {monthName}
      </h2>
      <div className="flex items-center" style={{ gap: 8 }}>
        <button
          type="button"
          onClick={onToday}
          disabled={isCurrentMonthToday}
          className="qc-btn qc-btn-ghost"
          style={{
            opacity: isCurrentMonthToday ? 0.4 : 1,
            cursor: isCurrentMonthToday ? "default" : "pointer",
          }}
        >
          Today
        </button>
        <div className="qc-cal-arrows">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous month"
          >
            <ChevronLeft size={14} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next month"
          >
            <ChevronRight size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CalendarEventChip({ event, onClick }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(event.id);
      }}
      className={`qc-cal-event${event.scope === "board" ? " is-board" : ""}`}
      title={event.title}
    >
      {event.scope === "board" && (
        <Lock size={9} strokeWidth={2.25} style={{ flexShrink: 0 }} />
      )}
      <span className="qc-cal-event-time qc-num">
        {formatTime(event.date).replace(":00", "").replace(" ", "").toLowerCase()}
      </span>
      <span className="qc-cal-event-title">{event.title}</span>
    </button>
  );
}

function CalendarDay({ day, events, isCurrentMonth, isToday, onEventClick }) {
  return (
    <div
      className={`qc-cal-day${isCurrentMonth ? "" : " is-other"}${isToday ? " is-today" : ""}`}
    >
      <div className="qc-cal-day-num">
        {isToday ? (
          <span className="qc-cal-day-num-today qc-num">{day.getDate()}</span>
        ) : (
          <span className="qc-num">{day.getDate()}</span>
        )}
      </div>
      {events.length > 0 && (
        <div className="qc-cal-day-events">
          {events.map((event) => (
            <CalendarEventChip
              key={event.id}
              event={event}
              onClick={onEventClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EventModal({ event, onClose }) {
  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  if (!event) return null;

  const d = new Date(event.date);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="qc-modal-overlay" onClick={onClose}>
      <div
        className="qc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qc-event-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between"
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
            background: "var(--bg)",
          }}
        >
          <div className="flex items-center" style={{ gap: 10 }}>
            {event.scope === "board" ? (
              <span className="qc-tag">
                <Lock size={9} strokeWidth={2.25} />
                Board only
              </span>
            ) : (
              <span className="qc-tag-outline">All residents</span>
            )}
            <span className="qc-caps-sm" style={{ color: "var(--t3)" }}>
              {event.type}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--t2)",
              padding: 4,
              display: "flex",
              alignItems: "center",
              borderRadius: 4,
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="qc-modal-body" style={{ padding: "26px 28px 28px", flex: 1 }}>
          <div
            className="qc-caps qc-num"
            style={{ color: "var(--t3)", fontWeight: 500, marginBottom: 8 }}
          >
            {weekday} · {dateStr}
          </div>
          <h2
            id="qc-event-modal-title"
            style={{
              fontSize: 24,
              fontWeight: 600,
              lineHeight: 1.2,
              color: "var(--t1)",
              letterSpacing: "-0.02em",
              marginTop: 0,
              marginBottom: 16,
            }}
          >
            {event.title}
          </h2>

          <div
            className="qc-num flex items-center"
            style={{ gap: 10, fontSize: 13, color: "var(--t2)", flexWrap: "wrap" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MapPin size={12} strokeWidth={1.75} />
              {event.location}
            </span>
            <span style={{ color: "var(--t4)" }}>·</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Clock size={12} strokeWidth={1.75} />
              {formatTime(event.date)} · {event.duration}
            </span>
          </div>

          {event.note && (
            <p
              style={{
                fontSize: 14,
                color: "var(--t2)",
                lineHeight: 1.6,
                borderLeft: "2px solid var(--ink)",
                paddingLeft: 14,
                marginTop: 22,
                marginBottom: 0,
              }}
            >
              {event.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CalendarSection({ events }) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [openEventId, setOpenEventId] = useState(null);

  const days = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);
  const eventsByDay = useMemo(() => {
    const map = new Map();
    events.forEach((event) => {
      const d = new Date(event.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [events]);

  const handlePrev = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() - 1);
    setCurrentMonth(d);
  };
  const handleNext = () => {
    const d = new Date(currentMonth);
    d.setMonth(d.getMonth() + 1);
    setCurrentMonth(d);
  };
  const handleToday = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const isCurrentMonthToday = isSameMonth(currentMonth, today);
  const openEvent = openEventId ? events.find((e) => e.id === openEventId) : null;

  return (
    <section style={{ marginBottom: 56 }}>
      <p
        style={{
          fontSize: 14,
          color: "var(--t2)",
          lineHeight: 1.6,
          fontWeight: 400,
          margin: "0 0 28px",
          maxWidth: "72ch",
        }}
      >
        The board's standing schedule — monthly meetings, quarterly walk-throughs,
        and the annual homeowner gathering. Open sessions welcome any resident;
        closed sessions are board-only and handle confidential matters.
      </p>

      <CalendarHeader
        currentMonth={currentMonth}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        isCurrentMonthToday={isCurrentMonthToday}
      />

      <div className="qc-cal-grid">
        <div className="qc-cal-weekdays">
          {WEEKDAYS.map((day) => (
            <div key={day} className="qc-cal-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="qc-cal-days">
          {days.map((day, i) => {
            const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
            const dayEvents = eventsByDay.get(key) || [];
            return (
              <CalendarDay
                key={i}
                day={day}
                events={dayEvents}
                isCurrentMonth={isSameMonth(day, currentMonth)}
                isToday={isSameDay(day, today)}
                onEventClick={setOpenEventId}
              />
            );
          })}
        </div>
      </div>

      {openEvent && (
        <EventModal event={openEvent} onClose={() => setOpenEventId(null)} />
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
//  MAINTENANCE REQUEST
// ─────────────────────────────────────────────────────────────────

function ChipGroup({ options, value, onChange }) {
  return (
    <div className="qc-chip-group">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`qc-chip${value === opt.id ? " is-active" : ""}`}
          aria-pressed={value === opt.id}
        >
          <span className="qc-chip-label">{opt.label}</span>
          {opt.sub && <span className="qc-chip-sub">{opt.sub}</span>}
        </button>
      ))}
    </div>
  );
}

function Stepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="qc-stepper" role="tablist" aria-label="Form steps">
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isComplete = i < currentStep;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onStepClick(i)}
            className={`qc-step${isActive ? " is-active" : ""}${isComplete ? " is-complete" : ""}`}
          >
            <span className="qc-step-num qc-num">{pad2(i + 1)}</span>
            <span className="qc-step-label">{step}</span>
          </button>
        );
      })}
    </div>
  );
}

function StepNav({ currentStep, totalSteps, onPrev, onNext }) {
  return (
    <div className="qc-step-nav">
      {currentStep > 0 ? (
        <button
          type="button"
          onClick={onPrev}
          className="qc-btn qc-btn-ghost"
        >
          <ChevronLeft size={12} strokeWidth={1.75} />
          Back
        </button>
      ) : (
        <span />
      )}
      {currentStep < totalSteps - 1 ? (
        <button
          type="button"
          onClick={onNext}
          className="qc-btn qc-btn-primary"
        >
          Continue
          <ChevronRight size={12} strokeWidth={1.75} />
        </button>
      ) : (
        <span
          className="qc-caps-sm"
          style={{ color: "var(--t3)", padding: "8px 0" }}
        >
          Last step — copy or open in AppFolio →
        </span>
      )}
    </div>
  );
}

function HelpPopover({ label = "About this form", children }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handlePointer(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div
      className={`qc-help-pop${open ? " is-open" : ""}`}
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="qc-help-pop-trigger"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
      >
        <Info size={12} strokeWidth={1.75} />
        {label}
        <ChevronDown
          size={11}
          strokeWidth={2}
          className="qc-help-pop-caret"
        />
      </button>
      {open && (
        <div className="qc-help-pop-panel" role="dialog" aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
}

function MaintenanceSection() {
  const hoa = useHoa();
  const appfolioBase = hoa.appfolio_base || "";
  const appfolioNew = appfolioBase ? `${appfolioBase}/online_work_orders/new` : "";
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [urgency, setUrgency] = useState("");
  const [details, setDetails] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(0);

  const STEPS = ["What & where", "Severity", "Details"];

  const categoryLabel =
    MAINTENANCE_CATEGORIES.find((c) => c.id === category)?.label || "";
  const durationLabel =
    MAINTENANCE_DURATIONS.find((d) => d.id === duration)?.label || "";
  const urgencyLabel =
    MAINTENANCE_URGENCIES.find((u) => u.id === urgency)?.label || "";

  const message = useMemo(
    () =>
      generateMaintenanceMessage({
        categoryLabel,
        location,
        durationLabel,
        urgencyLabel,
        details,
      }),
    [categoryLabel, location, durationLabel, urgencyLabel, details]
  );
  const hasContent = message.length > 0;

  const handleCopy = async () => {
    if (!hasContent) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Clipboard API unavailable — silently fail.
    }
  };

  const handleSend = async () => {
    if (!hasContent) return;
    try {
      await apiPost(`/api/hoas/${hoa.id}/submissions`, {
        form_type: "maintenance",
        payload: {
          categoryLabel, location, durationLabel, urgencyLabel, details,
        },
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section style={{ marginBottom: 56 }}>
      <div className="qc-form-grid">
        <div className="qc-form-fields">
          <Stepper steps={STEPS} currentStep={step} onStepClick={setStep} />

          {step === 0 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field">
                <label className="qc-form-label">What's the issue about?</label>
                <ChipGroup
                  options={MAINTENANCE_CATEGORIES}
                  value={category}
                  onChange={setCategory}
                />
              </div>

              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label" htmlFor="qc-loc">
                  Where is this happening?
                </label>
                <input
                  id="qc-loc"
                  type="text"
                  className="qc-input"
                  placeholder="e.g., 3rd floor hallway near unit 304"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field">
                <label className="qc-form-label">How long has it been going on?</label>
                <ChipGroup
                  options={MAINTENANCE_DURATIONS}
                  value={duration}
                  onChange={setDuration}
                />
              </div>

              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label">How urgent?</label>
                <ChipGroup
                  options={MAINTENANCE_URGENCIES}
                  value={urgency}
                  onChange={setUrgency}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label" htmlFor="qc-details">
                  Anything else worth knowing?
                </label>
                <textarea
                  id="qc-details"
                  className="qc-textarea"
                  placeholder="Describe what you see, hear, or smell. The more specific, the better."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          )}

          <StepNav
            currentStep={step}
            totalSteps={STEPS.length}
            onPrev={() => setStep(Math.max(0, step - 1))}
            onNext={() => setStep(Math.min(STEPS.length - 1, step + 1))}
          />
        </div>

        <div className="qc-form-aside">
          <div className="qc-form-aside-sticky">
            <div className="qc-preview">
              <div className="qc-preview-head">
                <span
                  className="qc-caps"
                  style={{ color: "var(--t1)", fontWeight: 600 }}
                >
                  Your message
                </span>
                {hasContent && (
                  <span
                    className="qc-caps-sm qc-num"
                    style={{ color: "var(--t3)" }}
                  >
                    {message.length} characters
                  </span>
                )}
              </div>
              <div className="qc-preview-body">
                {hasContent ? (
                  message
                ) : (
                  <span className="qc-preview-empty">
                    Make a few selections to see your message take shape.
                  </span>
                )}
              </div>
            </div>

            <div className="qc-form-actions">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!hasContent}
                className="qc-btn qc-btn-primary"
              >
                {copied ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : (
                  <Copy size={12} strokeWidth={1.75} />
                )}
                {copied ? "Copied" : "Copy message"}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!hasContent}
                className="qc-btn qc-btn-ghost"
              >
                <Send size={12} strokeWidth={1.75} />
                {sent ? "Sent" : "Send to manager"}
              </button>
              {appfolioNew && (
                <a
                  href={appfolioNew}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qc-btn qc-btn-ghost"
                  style={{ textDecoration: "none" }}
                >
                  Open in AppFolio
                  <ArrowUpRight size={12} strokeWidth={1.75} />
                </a>
              )}
            </div>

            <p
              style={{
                fontSize: 12.5,
                color: "var(--t3)",
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              "Send to manager" emails the request straight to {hoa.name}'s
              property manager. You can also copy and paste it into AppFolio.
            </p>

            <HelpPopover label="What is this form for?">
              <p>
                AGM handles maintenance for the building — leaks, lighting, doors,
                lobbies, roof, grounds. They cannot help with what's inside your
                unit; that's your responsibility, or your landlord's. For unit
                modifications, use Architectural Reviews; for emergencies, call 911.
              </p>
              <p>
                Use this form to draft a clear, structured request. Once you've
                made a few selections, copy the generated message and paste it into
                AppFolio's maintenance form.
              </p>
            </HelpPopover>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ARCHITECTURAL REVIEW REQUEST
// ─────────────────────────────────────────────────────────────────

function ArchitecturalSection() {
  const hoa = useHoa();
  const appfolioBase = hoa.appfolio_base || "";
  const appfolioNew = appfolioBase ? `${appfolioBase}/architectural_reviews/new` : "";
  const [projectType, setProjectType] = useState("");
  const [projectName, setProjectName] = useState("");
  const [unitLocation, setUnitLocation] = useState("");
  const [materials, setMaterials] = useState("");
  const [contractor, setContractor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(0);

  const STEPS = ["Project type", "Details", "Logistics", "Notes"];

  const projectTypeLabel =
    ARC_PROJECT_TYPES.find((p) => p.id === projectType)?.label || "";
  const contractorLabel =
    ARC_CONTRACTOR_TYPES.find((c) => c.id === contractor)?.label || "";
  const durationLabel =
    ARC_DURATIONS.find((d) => d.id === duration)?.label || "";

  const message = useMemo(
    () =>
      generateArchitecturalMessage({
        projectTypeLabel,
        projectName,
        unitLocation,
        materials,
        contractorLabel,
        startDate,
        durationLabel,
        notes,
      }),
    [
      projectTypeLabel,
      projectName,
      unitLocation,
      materials,
      contractorLabel,
      startDate,
      durationLabel,
      notes,
    ]
  );
  const hasContent = message.length > 0;

  const handleCopy = async () => {
    if (!hasContent) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Clipboard API unavailable — silently fail.
    }
  };

  const handleSend = async () => {
    if (!hasContent) return;
    try {
      await apiPost(`/api/hoas/${hoa.id}/submissions`, {
        form_type: "architectural",
        payload: {
          projectTypeLabel, projectName, unitLocation, materials,
          contractorLabel, startDate, durationLabel, notes,
        },
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section style={{ marginBottom: 56 }}>
      <div className="qc-form-grid">
        <div className="qc-form-fields">
          <Stepper steps={STEPS} currentStep={step} onStepClick={setStep} />

          {step === 0 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label">What kind of project?</label>
                <ChipGroup
                  options={ARC_PROJECT_TYPES}
                  value={projectType}
                  onChange={setProjectType}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field">
                <label className="qc-form-label" htmlFor="qc-arc-name">
                  Brief project name
                </label>
                <input
                  id="qc-arc-name"
                  type="text"
                  className="qc-input"
                  placeholder="e.g., Replace kitchen flooring with engineered hardwood"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="qc-form-field">
                <label className="qc-form-label" htmlFor="qc-arc-loc">
                  Where in your unit?
                </label>
                <input
                  id="qc-arc-loc"
                  type="text"
                  className="qc-input"
                  placeholder="e.g., Master bathroom, kitchen, balcony"
                  value={unitLocation}
                  onChange={(e) => setUnitLocation(e.target.value)}
                />
              </div>

              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label" htmlFor="qc-arc-materials">
                  Materials and finish
                </label>
                <textarea
                  id="qc-arc-materials"
                  className="qc-textarea"
                  placeholder="Brand if known, color or finish, dimensions. Spec sheets and product photos can be attached in AppFolio after submission."
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field">
                <label className="qc-form-label">Who's doing the work?</label>
                <ChipGroup
                  options={ARC_CONTRACTOR_TYPES}
                  value={contractor}
                  onChange={setContractor}
                />
              </div>

              <div className="qc-form-field">
                <label className="qc-form-label" htmlFor="qc-arc-start">
                  Estimated start
                </label>
                <input
                  id="qc-arc-start"
                  type="text"
                  className="qc-input"
                  placeholder="e.g., June 2026"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label">Estimated duration</label>
                <ChipGroup
                  options={ARC_DURATIONS}
                  value={duration}
                  onChange={setDuration}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label" htmlFor="qc-arc-notes">
                  Anything else the committee should know?
                </label>
                <textarea
                  id="qc-arc-notes"
                  className="qc-textarea"
                  placeholder="Special considerations — noise, contractor access, common-area impact, neighboring units."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          )}

          <StepNav
            currentStep={step}
            totalSteps={STEPS.length}
            onPrev={() => setStep(Math.max(0, step - 1))}
            onNext={() => setStep(Math.min(STEPS.length - 1, step + 1))}
          />
        </div>

        <div className="qc-form-aside">
          <div className="qc-form-aside-sticky">
            <div className="qc-preview">
              <div className="qc-preview-head">
                <span
                  className="qc-caps"
                  style={{ color: "var(--t1)", fontWeight: 600 }}
                >
                  Your message
                </span>
                {hasContent && (
                  <span
                    className="qc-caps-sm qc-num"
                    style={{ color: "var(--t3)" }}
                  >
                    {message.length} characters
                  </span>
                )}
              </div>
              <div className="qc-preview-body">
                {hasContent ? (
                  message
                ) : (
                  <span className="qc-preview-empty">
                    Make a few selections to see your message take shape.
                  </span>
                )}
              </div>
            </div>

            <div className="qc-form-actions">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!hasContent}
                className="qc-btn qc-btn-primary"
              >
                {copied ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : (
                  <Copy size={12} strokeWidth={1.75} />
                )}
                {copied ? "Copied" : "Copy message"}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!hasContent}
                className="qc-btn qc-btn-ghost"
              >
                <Send size={12} strokeWidth={1.75} />
                {sent ? "Sent" : "Send to ARC"}
              </button>
              {appfolioNew && (
                <a
                  href={appfolioNew}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="qc-btn qc-btn-ghost"
                  style={{ textDecoration: "none" }}
                >
                  Open in AppFolio
                  <ArrowUpRight size={12} strokeWidth={1.75} />
                </a>
              )}
            </div>

            <p
              style={{
                fontSize: 12.5,
                color: "var(--t3)",
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              Paste your message into the "Project Description" field. Attach
              spec sheets, product photos, and contractor information as
              supporting documents. The committee will respond after their next
              monthly meeting — see the Calendar tab for upcoming sessions.
            </p>

            <HelpPopover label="What is this form for?">
              <p>
                The Architectural Review Committee approves modifications that
                affect the building's structure, systems, or appearance —
                flooring, exterior changes, plumbing or electrical work. They
                meet monthly to review submissions; complete requests get
                faster decisions.
              </p>
              <p>
                What doesn't need review: paint inside your unit, furniture,
                removable décor, appliances using existing connections. When in
                doubt, ask before you start — undoing unauthorized work costs
                more than getting approval.
              </p>
            </HelpPopover>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
//  CONTACT (board / manager)
// ─────────────────────────────────────────────────────────────────

function ContactSection() {
  const hoa = useHoa();
  const recipients = useMemo(() => ({
    board: hoa.board_email
      ? { email: hoa.board_email, label: `${hoa.name} Board` }
      : { email: hoa.manager_email, label: `${hoa.name} (via AGM)` },
    manager: { email: hoa.manager_email, label: "AGM Property Management" },
  }), [hoa]);

  const [category, setCategory] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [unit, setUnit] = useState("");
  const [message, setMessage] = useState("");
  const [replyPref, setReplyPref] = useState("");
  const [phone, setPhone] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState(0);

  const STEPS = ["Topic", "Message", "Reply"];

  const selectedCategory = CONTACT_CATEGORIES.find((c) => c.id === category);
  const categoryLabel = selectedCategory?.label || "";
  const recipientInfo = selectedCategory ? recipients[selectedCategory.recipient] : null;
  const replyPrefLabel =
    CONTACT_REPLY_PREFS.find((r) => r.id === replyPref)?.label || "";

  const showPhone = replyPref === "phone" || replyPref === "either";

  const { subject, body } = useMemo(
    () =>
      generateContactEmail({
        hoaName: hoa.name,
        categoryLabel,
        subjectInput,
        unit,
        message,
        replyPrefLabel,
        phone: showPhone ? phone : "",
      }),
    [hoa.name, categoryLabel, subjectInput, unit, message, replyPrefLabel, phone, showPhone]
  );

  const hasContent = subject.length > 0 || body.length > 0;
  const canSend = hasContent && recipientInfo;

  const mailtoUrl = useMemo(() => {
    if (!recipientInfo) return "";
    const params = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    return `mailto:${recipientInfo.email}${params.length ? "?" + params.join("&") : ""}`;
  }, [recipientInfo, subject, body]);

  const handleCopy = async () => {
    if (!canSend) return;
    try {
      const fullText = `To: ${recipientInfo.email}\nSubject: ${subject}\n\n${body}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // silent
    }
  };

  const handleSendThroughPortal = async () => {
    if (!canSend) return;
    try {
      await apiPost(`/api/hoas/${hoa.id}/submissions`, {
        form_type: "contact",
        payload: {
          categoryLabel,
          subjectInput,
          unit,
          message,
          replyPrefLabel,
          phone: showPhone ? phone : "",
          recipient: selectedCategory.recipient,
        },
        submitter: { unit },
      });
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section style={{ marginBottom: 56 }}>
      <div className="qc-form-grid">
        <div className="qc-form-fields">
          <p
            style={{
              fontSize: 14,
              color: "var(--t2)",
              lineHeight: 1.6,
              fontWeight: 400,
              margin: "0 0 14px",
            }}
          >
            Reach the board or AGM Property Management about anything that
            doesn't fit the other tabs — noise complaints, parking issues,
            amenity bookings, move coordination, or general questions about the
            building.
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--t2)",
              lineHeight: 1.6,
              fontWeight: 400,
              margin: "0 0 32px",
            }}
          >
            For maintenance issues, use Maintenance Request. For unit
            modifications, use Architectural Review. For payment status or
            assessments, AppFolio's Account Profile is the fastest path.
          </p>

          <Stepper steps={STEPS} currentStep={step} onStepClick={setStep} />

          {step === 0 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label">What's this about?</label>
                <ChipGroup
                  options={CONTACT_CATEGORIES}
                  value={category}
                  onChange={setCategory}
                />
                {recipientInfo && (
                  <div
                    className="qc-caps-sm"
                    style={{
                      color: "var(--t3)",
                      marginTop: 12,
                      fontWeight: 500,
                    }}
                  >
                    → Reaches {recipientInfo.label}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field">
                <label className="qc-form-label" htmlFor="qc-contact-subject">
                  Subject line
                </label>
                <input
                  id="qc-contact-subject"
                  type="text"
                  className="qc-input"
                  placeholder="A short summary of why you're writing"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                />
              </div>

              <div className="qc-form-field">
                <label className="qc-form-label" htmlFor="qc-contact-unit">
                  Your unit number
                </label>
                <input
                  id="qc-contact-unit"
                  type="text"
                  className="qc-input"
                  placeholder="e.g., 304"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </div>

              <div className="qc-form-field" style={{ marginBottom: 0 }}>
                <label className="qc-form-label" htmlFor="qc-contact-message">
                  Your message
                </label>
                <textarea
                  id="qc-contact-message"
                  className="qc-textarea"
                  placeholder="Write what you'd say in an email — context, what you need, anything the recipient should know."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="qc-step-panel qc-fade-in">
              <div className="qc-form-field" style={{ marginBottom: showPhone ? 28 : 0 }}>
                <label className="qc-form-label">Best way to reach you back?</label>
                <ChipGroup
                  options={CONTACT_REPLY_PREFS}
                  value={replyPref}
                  onChange={setReplyPref}
                />
              </div>

              {showPhone && (
                <div className="qc-form-field" style={{ marginBottom: 0 }}>
                  <label className="qc-form-label" htmlFor="qc-contact-phone">
                    Phone number
                  </label>
                  <input
                    id="qc-contact-phone"
                    type="tel"
                    className="qc-input"
                    placeholder="(206) 555-0184"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          <StepNav
            currentStep={step}
            totalSteps={STEPS.length}
            onPrev={() => setStep(Math.max(0, step - 1))}
            onNext={() => setStep(Math.min(STEPS.length - 1, step + 1))}
          />
        </div>

        <div className="qc-form-aside">
          <div className="qc-form-aside-sticky">
            <div className="qc-preview">
              <div className="qc-preview-head">
                <span
                  className="qc-caps"
                  style={{ color: "var(--t1)", fontWeight: 600 }}
                >
                  Email preview
                </span>
                {recipientInfo && (
                  <span
                    className="qc-caps-sm"
                    style={{ color: "var(--t3)" }}
                  >
                    {body.length} characters
                  </span>
                )}
              </div>
              <div className="qc-preview-body">
                {canSend ? (
                  <>
                    <div className="qc-email-row">
                      <span className="qc-email-label">To</span>
                      <span className="qc-email-value">
                        {recipientInfo.label} &lt;{recipientInfo.email}&gt;
                      </span>
                    </div>
                    <div className="qc-email-row">
                      <span className="qc-email-label">Subject</span>
                      <span className="qc-email-value">
                        {subject || (
                          <span style={{ color: "var(--t3)" }}>
                            (no subject yet)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="qc-email-divider" />
                    <div className="qc-email-body">
                      {body || (
                        <span className="qc-preview-empty">
                          Your message will appear here as you type.
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="qc-preview-empty">
                    Pick a category to see your email take shape.
                  </span>
                )}
              </div>
            </div>

            <div className="qc-form-actions">
              <button
                type="button"
                onClick={handleSendThroughPortal}
                disabled={!canSend}
                className="qc-btn qc-btn-primary"
              >
                <Send size={12} strokeWidth={1.75} />
                {sent ? "Sent" : "Send through portal"}
              </button>
              {canSend ? (
                <a
                  href={mailtoUrl}
                  className="qc-btn qc-btn-ghost"
                  style={{ textDecoration: "none" }}
                >
                  Open in mail app
                  <ArrowUpRight size={12} strokeWidth={1.75} />
                </a>
              ) : null}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!canSend}
                className="qc-btn qc-btn-ghost"
              >
                {copied ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : (
                  <Copy size={12} strokeWidth={1.75} />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <p
              style={{
                fontSize: 12.5,
                color: "var(--t3)",
                marginTop: 16,
                lineHeight: 1.5,
              }}
            >
              "Send through portal" delivers the message directly. The board
              typically responds within a few business days; AGM within one
              business day.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DOCUMENTS — SEARCH BAR
// ─────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }) {
  return (
    <div
      className="qc-search flex items-center"
      style={{
        padding: "10px 14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        marginBottom: 24,
        gap: 10,
        boxShadow: "var(--shadow-sm)",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <Search size={14} strokeWidth={1.75} style={{ color: "var(--t3)" }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search documents…"
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 13,
          color: "var(--t1)",
          fontFamily: "inherit",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--t3)",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={13} strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DOCUMENTS — FOLDER ROW (typographic table)
// ─────────────────────────────────────────────────────────────────

function FolderRow({ folder, onClick, isActive, showScope = false }) {
  return (
    <button
      onClick={onClick}
      className={`qc-folder-row${isActive ? " is-active" : ""}`}
      aria-label={folder.name}
    >
      <div className="qc-folder-content">
        <h3 className="qc-folder-title">
          {folder.name}
          {showScope && (
            folder.scope === "board" ? (
              <span className="qc-tag">
                <Lock size={9} strokeWidth={2.25} />
                Board
              </span>
            ) : (
              <span className="qc-tag-outline">All</span>
            )
          )}
        </h3>
        <p className="qc-folder-narrative">{folder.narrative}</p>
      </div>
      <div className="qc-folder-updated qc-num">{formatTableDate(lastUpdated(folder))}</div>
      <ChevronRight size={14} strokeWidth={1.75} className="qc-folder-arrow" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DOCUMENTS — FOLDER CARD (grid view)
// ─────────────────────────────────────────────────────────────────

function FolderCard({ folder, onClick, isActive, showScope = false }) {
  return (
    <button
      onClick={onClick}
      className={`qc-folder-card${isActive ? " is-active" : ""}`}
      aria-label={folder.name}
    >
      <div className="qc-folder-card-top">
        <span className="qc-folder-card-updated qc-num">
          {formatTableDate(lastUpdated(folder))}
        </span>
        {showScope && (
          folder.scope === "board" ? (
            <span className="qc-tag">
              <Lock size={9} strokeWidth={2.25} />
              Board
            </span>
          ) : (
            <span className="qc-tag-outline">All</span>
          )
        )}
      </div>
      <h3 className="qc-folder-card-title">{folder.name}</h3>
      <p className="qc-folder-card-narrative">{folder.narrative}</p>
      <ChevronRight size={14} strokeWidth={1.75} className="qc-folder-card-arrow" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DOCUMENTS — VIEW TOGGLE
// ─────────────────────────────────────────────────────────────────

function ViewToggle({ view, onChange }) {
  return (
    <div className="qc-view-toggle" role="tablist" aria-label="View">
      <button
        type="button"
        role="tab"
        aria-selected={view === "list"}
        aria-label="List view"
        title="List view"
        onClick={() => onChange("list")}
        className={view === "list" ? "is-active" : ""}
      >
        <LayoutList size={13} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "grid"}
        aria-label="Grid view"
        title="Grid view"
        onClick={() => onChange("grid")}
        className={view === "grid" ? "is-active" : ""}
      >
        <LayoutGrid size={13} strokeWidth={1.75} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DOCUMENTS — FOLDER VIEW (renders list or grid)
// ─────────────────────────────────────────────────────────────────

function FolderView({ view, folders, onFolderClick, activeFolderId, showScope = false }) {
  if (view === "grid") {
    return (
      <div className="qc-folder-grid">
        {folders.map((f) => (
          <FolderCard
            key={f.id}
            folder={f}
            onClick={() => onFolderClick(f.id)}
            isActive={activeFolderId === f.id}
            showScope={showScope}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="qc-folder-list">
      {folders.map((f) => (
        <FolderRow
          key={f.id}
          folder={f}
          onClick={() => onFolderClick(f.id)}
          isActive={activeFolderId === f.id}
          showScope={showScope}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  TOP VIEW SWITCHER (Calendar / Documents)
// ─────────────────────────────────────────────────────────────────

function TopViewSwitcher({ topView, onTopViewChange, docsView, onDocsViewChange, boardMode, onLogout, events, folders }) {
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [events]
  );
  const totalFiles = useMemo(
    () => folders.reduce((acc, f) => acc + f.files.length, 0),
    [folders]
  );
  const next = sortedEvents[0];

  return (
    <div className="qc-top-switcher">
      {/* Tabs */}
      <div className="qc-top-tabs" role="tablist" aria-label="Section">
        <button
          type="button"
          role="tab"
          aria-selected={topView === "calendar"}
          onClick={() => onTopViewChange("calendar")}
          className={`qc-top-tab${topView === "calendar" ? " is-active" : ""}`}
        >
          <div className="qc-top-tab-label">Calendar</div>
          <div className="qc-top-tab-meta qc-num">
            {next
              ? `Next ${formatDateShort(next.date)} · ${pad2(sortedEvents.length)} scheduled`
              : "Nothing scheduled yet"}
          </div>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={topView === "documents"}
          onClick={() => onTopViewChange("documents")}
          className={`qc-top-tab${topView === "documents" ? " is-active" : ""}`}
        >
          <div className="qc-top-tab-label">Documents</div>
          <div className="qc-top-tab-meta qc-num">
            {folders.length} sections · {totalFiles} files
          </div>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={topView === "maintenance"}
          onClick={() => onTopViewChange("maintenance")}
          className={`qc-top-tab${topView === "maintenance" ? " is-active" : ""}`}
        >
          <div className="qc-top-tab-label">Maintenance Request</div>
          <div className="qc-top-tab-meta">Build a structured request</div>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={topView === "architectural"}
          onClick={() => onTopViewChange("architectural")}
          className={`qc-top-tab${topView === "architectural" ? " is-active" : ""}`}
        >
          <div className="qc-top-tab-label">Architectural Review</div>
          <div className="qc-top-tab-meta">Submit a project for approval</div>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={topView === "contact"}
          onClick={() => onTopViewChange("contact")}
          className={`qc-top-tab${topView === "contact" ? " is-active" : ""}`}
        >
          <div className="qc-top-tab-label">Contact</div>
          <div className="qc-top-tab-meta">Message the board or AGM</div>
        </button>
      </div>

      {/* Right: docs view toggle (when applicable) + Board pill (when unlocked) + Logout */}
      <div className="qc-top-side qc-top-side-right">
        {topView === "documents" && (
          <ViewToggle view={docsView} onChange={onDocsViewChange} />
        )}
        {boardMode && (
          <div
            className="flex items-center"
            title="Board mode unlocked for 24 hours"
            style={{
              border: "1px solid var(--ink)",
              color: "var(--t1)",
              padding: "5px 10px",
              borderRadius: 5,
              fontSize: 10.5,
              fontWeight: 600,
              gap: 6,
              background: "var(--surface)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <Lock size={10} strokeWidth={2.25} />
            Board
          </div>
        )}
        <button
          className="qc-btn qc-btn-ghost"
          style={{ padding: "5px 10px" }}
          onClick={onLogout}
        >
          <LogOut size={11} strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COLLAPSIBLE SECTION HEADER
// ─────────────────────────────────────────────────────────────────

function SectionHeader({ numeral, title, sublabel, count, isOpen, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="qc-section-head"
      aria-expanded={isOpen}
    >
      <span className="qc-section-numeral qc-num">{numeral}</span>
      <div style={{ minWidth: 0 }}>
        <div className="qc-section-title">{title}</div>
        {sublabel && <div className="qc-section-sub">{sublabel}</div>}
      </div>
      <div className="qc-section-toggle">
        <span className="qc-num">{pad2(count)}</span>
        {isOpen ? (
          <ChevronDown size={14} strokeWidth={2} />
        ) : (
          <ChevronRight size={14} strokeWidth={2} />
        )}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COLLAPSIBLE GROUP
// ─────────────────────────────────────────────────────────────────

function CollapsibleGroup({ numeral, label, sublabel, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 36 }}>
      <SectionHeader
        numeral={numeral}
        title={label}
        sublabel={sublabel}
        count={count}
        isOpen={open}
        onToggle={() => setOpen(!open)}
      />
      {open && <div className="qc-fade-in">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  FOLDER DETAIL — inline sub-page with side rail + preview
// ─────────────────────────────────────────────────────────────────

function FolderDetailPane({ folder, onBack }) {
  const hoa = useHoa();
  const hoaId = hoa.id;
  const sortedFiles = useMemo(
    () =>
      [...folder.files].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [folder]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = sortedFiles[selectedIndex] || sortedFiles[0];

  useEffect(() => {
    function handleEscape(e) {
      if (e.key === "Escape") onBack();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onBack]);

  return (
    <section className="qc-folder-detail qc-fade-in">
      <div className="qc-folder-detail-topbar">
        <button onClick={onBack} className="qc-folder-detail-back" type="button">
          <ChevronLeft size={13} strokeWidth={2} />
          All sections
        </button>
        <div className="qc-folder-detail-topbar-meta">
          {folder.scope === "board" ? (
            <span className="qc-tag">
              <Lock size={9} strokeWidth={2.25} />
              Board only
            </span>
          ) : (
            <span className="qc-tag-outline">All residents</span>
          )}
          <span className="qc-caps-sm qc-num" style={{ color: "var(--t3)" }}>
            Latest {formatDateShort(lastUpdated(folder))}
          </span>
        </div>
      </div>

      <header className="qc-folder-detail-header">
        <h2 className="qc-folder-detail-title">{folder.name}</h2>
        <p className="qc-folder-detail-narrative">{folder.narrative}</p>
      </header>

      <div className="qc-folder-detail-body">
        <aside className="qc-folder-detail-list" role="listbox" aria-label="Documents in this section">
          <div className="qc-folder-detail-list-head">
            <span>Documents</span>
            <span className="qc-num">{pad2(sortedFiles.length)}</span>
          </div>
          {sortedFiles.map((f, i) => {
            const isActive = i === selectedIndex;
            return (
              <button
                key={i}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => setSelectedIndex(i)}
                className={`qc-folder-detail-list-item${isActive ? " is-active" : ""}`}
              >
                <span className="qc-folder-detail-list-icon">
                  <FileText size={13} strokeWidth={1.6} />
                </span>
                <span className="qc-folder-detail-list-text">
                  <span className="qc-folder-detail-list-name">
                    {f.name.replace(/\.pdf$/, "")}
                  </span>
                  <span className="qc-folder-detail-list-meta qc-num">
                    {formatDateShort(f.date)} · {f.size}
                  </span>
                </span>
              </button>
            );
          })}
        </aside>

        {selected ? (
          <div className="qc-folder-detail-preview">
            <div className="qc-folder-detail-preview-head">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="qc-folder-detail-preview-name">
                  {selected.name.replace(/\.[^.]+$/, "")}
                </div>
                <div className="qc-folder-detail-preview-meta qc-num">
                  {(selected.name.match(/\.([^.]+)$/)?.[1] || "FILE").toUpperCase()} · {formatDateShort(selected.date)} · {selected.size}
                </div>
              </div>
              <a
                className="qc-btn qc-btn-primary"
                href={`/api/hoas/${hoaId}/documents/${selected.id}?download=1`}
                style={{ flexShrink: 0, textDecoration: "none" }}
              >
                <Download size={11} strokeWidth={2} />
                Download
              </a>
            </div>
            <div className="qc-folder-detail-preview-frame">
              <DocumentPreview file={selected} folder={folder} hoaId={hoaId} />
            </div>
          </div>
        ) : (
          <div className="qc-folder-detail-preview" style={{ padding: 32, color: "var(--t3)", fontSize: 13 }}>
            No documents in this section yet.
          </div>
        )}
      </div>
    </section>
  );
}

function DocumentPreview({ file, folder, hoaId }) {
  if (!file?.id) return <DocPlaceholder file={file} folder={folder} />;
  const url = `/api/hoas/${hoaId}/documents/${file.id}`;
  const lower = (file.name || "").toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  const isImage = /\.(png|jpe?g|gif|webp|avif|svg)$/.test(lower);

  if (isPdf) {
    // Browsers render PDFs natively in iframes/embeds. Same-origin so no
    // X-Frame-Options issue with our own resources.
    return (
      <iframe
        src={url}
        title={file.name}
        style={{
          width: "100%",
          height: "100%",
          minHeight: 600,
          border: "1px solid var(--border)",
          borderRadius: 4,
          background: "#fdfdfb",
        }}
      />
    );
  }
  if (isImage) {
    return (
      <img
        src={url}
        alt={file.name}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    );
  }
  return <DocPlaceholder file={file} folder={folder} />;
}

function DocPlaceholder({ file, folder }) {
  const hoa = useHoa();
  return (
    <article className="qc-doc-page" aria-label="Document preview">
      <div className="qc-doc-page-header">
        {hoa.name} · {folder.name}
      </div>
      <h3 className="qc-doc-page-title">{file.name.replace(/\.[^.]+$/, "")}</h3>
      <div className="qc-doc-page-date qc-num">
        {formatDateShort(file.date)} · {file.size}
      </div>
      <div style={{ marginTop: 24, fontSize: 13, color: "var(--t3)", lineHeight: 1.5 }}>
        No inline preview available for this file type. Use the Download
        button above to open it in a new tab.
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────
//  SEARCH RESULTS
// ─────────────────────────────────────────────────────────────────

function SearchResults({ query, folders, onFolderClick, activeFolderId, view = "list" }) {
  const lower = query.toLowerCase();
  const matched = folders.filter((folder) => {
    if (folder.name.toLowerCase().includes(lower)) return true;
    if (folder.narrative.toLowerCase().includes(lower)) return true;
    return folder.files.some((f) => f.name.toLowerCase().includes(lower));
  });

  return (
    <div className="qc-fade-in">
      <div
        className="flex items-baseline justify-between"
        style={{
          paddingBottom: 14,
          marginBottom: 0,
          borderBottom: "1px solid var(--border-strong)",
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--t1)" }}>
          {matched.length} {matched.length === 1 ? "match" : "matches"}
        </span>
        <span className="qc-caps-sm" style={{ color: "var(--t3)" }}>
          for “{query}”
        </span>
      </div>
      {matched.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--t3)", padding: "20px 14px" }}>
          Nothing found. Try a broader term.
        </p>
      ) : (
        <div style={{ marginTop: 4 }}>
          <FolderView
            view={view}
            folders={matched}
            onFolderClick={onFolderClick}
            activeFolderId={activeFolderId}
            showScope={true}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  DOCUMENTS PANE
// ─────────────────────────────────────────────────────────────────

function DocumentsPane({ openFolderId, setOpenFolderId, view, boardMode, onUnlockClick, folders }) {
  const [searchQuery, setSearchQuery] = useState("");

  const boardFolders = useMemo(
    () =>
      [...folders.filter((f) => f.scope === "board")].sort(
        (a, b) => new Date(lastUpdated(b)).getTime() - new Date(lastUpdated(a)).getTime()
      ),
    [folders]
  );
  const allFolders = useMemo(
    () =>
      [...folders.filter((f) => f.scope === "all")].sort(
        (a, b) => new Date(lastUpdated(b)).getTime() - new Date(lastUpdated(a)).getTime()
      ),
    [folders]
  );
  const isSearching = searchQuery.trim().length > 0;

  // When board mode is locked, exclude board-scoped folders from search results.
  const searchableFolders = boardMode
    ? folders
    : folders.filter((f) => f.scope !== "board");

  const openFolder = openFolderId ? folders.find((f) => f.id === openFolderId) : null;
  if (openFolder) {
    return (
      <FolderDetailPane folder={openFolder} onBack={() => setOpenFolderId(null)} />
    );
  }

  return (
    <section>
      <SearchBar value={searchQuery} onChange={setSearchQuery} />

      {isSearching ? (
        <SearchResults
          query={searchQuery}
          folders={searchableFolders}
          onFolderClick={(id) => setOpenFolderId(id)}
          activeFolderId={openFolderId}
          view={view}
        />
      ) : (
        <>
          {boardMode && (
            <CollapsibleGroup
              numeral="01"
              label="Board Materials"
              sublabel="Restricted to board members. Closed sessions, financials, and confidential records."
              count={boardFolders.length}
              defaultOpen={true}
            >
              <FolderView
                view={view}
                folders={boardFolders}
                onFolderClick={(id) => setOpenFolderId(id)}
                activeFolderId={openFolderId}
              />
            </CollapsibleGroup>
          )}

          <CollapsibleGroup
            numeral={boardMode ? "02" : "01"}
            label="Community Library"
            sublabel="Open to all residents. Governing documents, minutes, communications, and the long view."
            count={allFolders.length}
            defaultOpen={true}
          >
            <FolderView
              view={view}
              folders={allFolders}
              onFolderClick={(id) => setOpenFolderId(id)}
              activeFolderId={openFolderId}
            />
          </CollapsibleGroup>

          {!boardMode && (
            <div className="qc-unlock-prompt">
              <div className="qc-unlock-prompt-text">
                <Lock size={11} strokeWidth={1.75} style={{ color: "var(--t3)" }} />
                <span>
                  Board members can unlock additional documents — financials,
                  packets, closed-session records.
                </span>
              </div>
              <button
                type="button"
                onClick={onUnlockClick}
                className="qc-btn qc-btn-ghost"
              >
                Unlock Board Materials
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
//  ROOT — Resident app (multi-tenant)
// ─────────────────────────────────────────────────────────────────

const DEFAULT_HERO_IMG = "/queenscourt-hero.webp";

function SplashLogin({ hoa, onAuth }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const heroUrl = hoa.hero_image_key ? `/api/hoas/${hoa.id}/hero` : DEFAULT_HERO_IMG;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    try {
      await apiPost(`/api/hoas/${hoa.id}/auth/resident`, { password });
      onAuth();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="qc-splash" style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <style>{THEME_CSS}</style>
      <div className="qc-splash-frame">
        <div className="qc-splash-left" style={{ backgroundImage: `url(${heroUrl})` }}>
          <div className="qc-splash-left-overlay" />
          <div className="qc-splash-left-content">
            <div className="qc-splash-eyebrow">The resident portal</div>
            <h1 className="qc-splash-title">{hoa.name}</h1>
            <div className="qc-splash-address qc-num">
              {hoa.street && <div>{hoa.street}</div>}
              {hoa.city && <div>{hoa.city}</div>}
            </div>
            <div className="qc-splash-rule" />
            {hoa.era && <div className="qc-splash-era qc-num">{hoa.era}</div>}
          </div>
          <div className="qc-splash-foot qc-caps-sm">Managed by AGM Real Estate Group</div>
        </div>

        <div className="qc-splash-right">
          <div className="qc-splash-right-inner">
            <p className="qc-splash-lede">
              Documents, calendar, maintenance, and contact — everything the
              building keeps a record of, in one place. Open to residents and
              board members at this address.
            </p>

            <div className="qc-splash-form">
              <label className="qc-form-label" htmlFor="qc-splash-password" style={{ fontSize: 13 }}>
                Resident password
              </label>
              <input
                id="qc-splash-password"
                type="password"
                className="qc-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                autoFocus
                style={error ? { borderColor: "#b54a3c", marginTop: 12 } : { marginTop: 12 }}
              />
              {error && (
                <div style={{ fontSize: 12, color: "#b54a3c", marginTop: 8, fontWeight: 500 }}>
                  That password didn't match. Check the email AGM sent when you
                  moved in, or contact the manager below.
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                className="qc-btn qc-btn-primary"
                disabled={!password || busy}
                style={{ marginTop: 18, padding: "10px 16px", fontSize: 13 }}
              >
                Continue
                <ArrowUpRight size={12} strokeWidth={1.75} />
              </button>
            </div>

            <div className="qc-splash-help">
              <div className="qc-caps-sm" style={{ color: "var(--t3)", marginBottom: 6 }}>
                Need a password?
              </div>
              <div style={{ fontSize: 13, color: "var(--t2)", lineHeight: 1.5 }}>
                Contact the AGM property manager at{" "}
                <a href="mailto:manager@agmrealestategroup.com" style={{ color: "var(--t1)", fontWeight: 500 }}>
                  manager@agmrealestategroup.com
                </a>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnlockBoardModal({ hoa, onClose, onUnlock }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function handleEscape(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    try {
      await apiPost(`/api/hoas/${hoa.id}/auth/board`, { password });
      onUnlock();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="qc-modal-overlay" onClick={onClose}>
      <div
        className="qc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="qc-unlock-title"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460 }}
      >
        <div
          className="flex items-center justify-between"
          style={{ padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--bg)" }}
        >
          <span className="qc-tag">
            <Lock size={9} strokeWidth={2.25} />
            Restricted access
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--t2)", padding: 4, display: "flex", alignItems: "center", borderRadius: 4 }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ padding: "26px 28px 24px" }}>
          <h2 id="qc-unlock-title" style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, color: "var(--t1)", letterSpacing: "-0.02em", marginTop: 0, marginBottom: 10 }}>
            Unlock Board Materials
          </h2>
          <p style={{ fontSize: 14, color: "var(--t2)", lineHeight: 1.55, margin: "0 0 22px" }}>
            Board members were given an access password by the property manager.
            Enter it below to view financial reports, board packets, and other
            restricted documents.
          </p>

          <div>
            <div className="qc-form-field" style={{ marginBottom: 16 }}>
              <label className="qc-form-label" htmlFor="qc-unlock-password" style={{ fontSize: 13 }}>
                Board password
              </label>
              <input
                id="qc-unlock-password"
                type="password"
                className="qc-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(false); }}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                autoFocus
                style={error ? { borderColor: "#b54a3c" } : undefined}
              />
              {error && (
                <div style={{ fontSize: 12, color: "#b54a3c", marginTop: 8, fontWeight: 500 }}>
                  That password didn't match. Check with the property manager
                  if you've lost it.
                </div>
              )}
            </div>

            <div className="flex items-center" style={{ gap: 8 }}>
              <button type="button" onClick={handleSubmit} className="qc-btn qc-btn-primary" disabled={!password || busy}>
                <Lock size={11} strokeWidth={1.75} />
                Unlock for 24 hours
              </button>
              <button type="button" onClick={onClose} className="qc-btn qc-btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loads + caches per-HOA events, folders, and documents from the API.
function useResidentData(slug, residentAuthed, boardMode) {
  const [events, setEvents] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!slug || !residentAuthed) return;
    let cancelled = false;
    (async () => {
      try {
        const [evRes, foRes, docRes] = await Promise.all([
          apiGet(`/api/hoas/${slug}/events`),
          apiGet(`/api/hoas/${slug}/folders`),
          apiGet(`/api/hoas/${slug}/documents`),
        ]);
        if (cancelled) return;
        setEvents((evRes.events || []).map(shapeEvent));
        setFolders(shapeFolders(foRes.folders || [], docRes.documents || []));
        setLoaded(true);
      } catch (err) {
        console.error("Failed to load resident data", err);
      }
    })();
    return () => { cancelled = true; };
    // re-fetch when board mode flips since server filters by scope.
  }, [slug, residentAuthed, boardMode]);

  return { events, folders, loaded };
}

export default function QueensCourtPortal({ hoa }) {
  const slug = hoa.id;
  const [authChecked, setAuthChecked] = useState(false);
  const [residentAuthed, setResidentAuthed] = useState(false);
  const [boardMode, setBoardMode] = useState(false);
  const [openFolderId, setOpenFolderId] = useState(null);
  const [topView, setTopView] = useState("documents");
  const [docsView, setDocsView] = useState("grid");
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Check session against server cookies on mount + whenever the slug changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet(`/api/hoas/${slug}/auth/session`);
        if (cancelled) return;
        setResidentAuthed(!!data.resident);
        setBoardMode(!!data.board);
      } catch {
        // unauthenticated
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const { events, folders } = useResidentData(slug, residentAuthed, boardMode);

  const handleUnlock = () => {
    setBoardMode(true);
    setShowUnlockModal(false);
  };

  const handleLogout = async () => {
    try {
      await apiDelete(`/api/hoas/${slug}/auth/resident`);
      await apiDelete(`/api/hoas/${slug}/auth/board`);
    } catch {
      // ignore
    }
    setBoardMode(false);
    setResidentAuthed(false);
    setOpenFolderId(null);
  };

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <style>{THEME_CSS}</style>
      </div>
    );
  }

  if (!residentAuthed) {
    return (
      <HoaProvider hoa={hoa}>
        <SplashLogin hoa={hoa} onAuth={() => setResidentAuthed(true)} />
      </HoaProvider>
    );
  }

  return (
    <HoaProvider hoa={hoa}>
      <div className="qc-shell" style={{ minHeight: "100vh", background: "var(--bg)" }}>
        <style>{THEME_CSS}</style>

        <div className="qc-body" style={{ padding: "28px 48px 64px" }}>
          <TopViewSwitcher
            topView={topView}
            onTopViewChange={setTopView}
            docsView={docsView}
            onDocsViewChange={setDocsView}
            boardMode={boardMode}
            onLogout={handleLogout}
            events={events}
            folders={folders}
          />

          {topView === "calendar" && <CalendarSection events={events} />}
          {topView === "documents" && (
            <DocumentsPane
              openFolderId={openFolderId}
              setOpenFolderId={setOpenFolderId}
              view={docsView}
              boardMode={boardMode}
              onUnlockClick={() => setShowUnlockModal(true)}
              folders={folders}
            />
          )}
          {topView === "maintenance" && <MaintenanceSection />}
          {topView === "architectural" && <ArchitecturalSection />}
          {topView === "contact" && <ContactSection />}
        </div>

        {showUnlockModal && (
          <UnlockBoardModal
            hoa={hoa}
            onClose={() => setShowUnlockModal(false)}
            onUnlock={handleUnlock}
          />
        )}
      </div>
    </HoaProvider>
  );
}
