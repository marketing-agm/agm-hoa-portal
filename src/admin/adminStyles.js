// Self-contained admin CSS. Visually distinct from the resident UI so the
// manager always knows which side of the line they're on.

export const ADMIN_CSS = `
  @import url('https://rsms.me/inter/inter.css');

  :root {
    --a-bg: #0e0f12;
    --a-panel: #16181d;
    --a-panel-2: #1c1f25;
    --a-border: #2a2d35;
    --a-border-soft: #22252c;
    --a-text: #e6e7ea;
    --a-text-2: #9ea2ab;
    --a-text-3: #6b6f78;
    --a-accent: #d8e95a;
    --a-accent-text: #0e0f12;
    --a-danger: #e56c5c;
  }

  * { box-sizing: border-box; }

  .a-shell {
    min-height: 100vh;
    background: var(--a-bg);
    color: var(--a-text);
    font-family: 'Inter', -apple-system, sans-serif;
    font-size: 14px;
  }

  .a-bar {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; gap: 16px;
    padding: 10px 24px;
    background: var(--a-panel);
    border-bottom: 1px solid var(--a-border);
  }
  .a-bar-brand { font-weight: 600; letter-spacing: -0.01em; }
  .a-bar-eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--a-text-3); }
  .a-bar-spacer { flex: 1; }

  .a-select {
    background: var(--a-panel-2);
    color: var(--a-text);
    border: 1px solid var(--a-border);
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
  }

  .a-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px;
    border-radius: 6px;
    border: 1px solid var(--a-border);
    background: var(--a-panel-2);
    color: var(--a-text);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    text-decoration: none;
  }
  .a-btn:hover { border-color: #3a3e47; }
  .a-btn-primary {
    background: var(--a-accent);
    color: var(--a-accent-text);
    border-color: var(--a-accent);
    font-weight: 600;
  }
  .a-btn-primary:hover { filter: brightness(0.95); }
  .a-btn-danger { color: var(--a-danger); border-color: rgba(229, 108, 92, 0.4); }
  .a-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .a-body {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px 64px;
  }

  .a-tabs {
    display: flex; gap: 4px;
    border-bottom: 1px solid var(--a-border);
    margin-bottom: 28px;
  }
  .a-tab {
    background: none; border: none; cursor: pointer;
    color: var(--a-text-2);
    font: inherit; font-size: 13px;
    padding: 10px 14px;
    border-bottom: 2px solid transparent;
  }
  .a-tab.is-active { color: var(--a-text); border-bottom-color: var(--a-accent); }

  .a-card {
    background: var(--a-panel);
    border: 1px solid var(--a-border);
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .a-card h2 { margin: 0 0 14px; font-size: 16px; font-weight: 600; }
  .a-card h3 { margin: 0 0 10px; font-size: 14px; font-weight: 600; }

  .a-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .a-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

  .a-field { margin-bottom: 14px; }
  .a-field label {
    display: block; font-size: 12px; color: var(--a-text-2);
    margin-bottom: 6px; font-weight: 500;
  }
  .a-input, .a-textarea, .a-select-full {
    width: 100%;
    background: var(--a-panel-2);
    color: var(--a-text);
    border: 1px solid var(--a-border);
    border-radius: 6px;
    padding: 9px 11px;
    font-size: 13px;
    font-family: inherit;
  }
  .a-textarea { resize: vertical; min-height: 70px; }
  .a-help {
    font-size: 11.5px; color: var(--a-text-3); margin-top: 4px;
  }
  .a-error {
    font-size: 12px; color: var(--a-danger); margin-top: 6px;
  }

  .a-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 14px;
    border: 1px solid var(--a-border);
    border-radius: 8px;
    background: var(--a-panel-2);
    margin-bottom: 8px;
  }
  .a-row-meta { font-size: 12px; color: var(--a-text-3); }

  .a-empty {
    padding: 28px;
    text-align: center;
    color: var(--a-text-3);
    font-size: 13px;
    border: 1px dashed var(--a-border);
    border-radius: 10px;
  }

  .a-login-shell {
    min-height: 100vh;
    background: var(--a-bg);
    display: grid; place-items: center;
    padding: 24px;
  }
  .a-login-card {
    width: 100%; max-width: 380px;
    background: var(--a-panel);
    border: 1px solid var(--a-border);
    border-radius: 12px;
    padding: 28px;
  }

  .a-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 3px 9px; border-radius: 999px;
    background: var(--a-panel-2); border: 1px solid var(--a-border);
    font-size: 11px; color: var(--a-text-2);
  }

  details > summary { cursor: pointer; list-style: none; user-select: none; }
  details > summary::-webkit-details-marker { display: none; }
`;
