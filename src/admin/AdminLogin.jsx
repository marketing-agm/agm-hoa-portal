import { useState } from "react";
import { apiPost } from "../lib/api.js";

export default function AdminLogin({ onAuth }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError("");
    try {
      await apiPost("/api/admin/login", { password });
      onAuth();
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="a-login-shell">
      <form className="a-login-card" onSubmit={submit}>
        <div className="a-bar-eyebrow" style={{ marginBottom: 4 }}>
          AGM Property Management
        </div>
        <h1 style={{ margin: "0 0 18px", fontSize: 18, fontWeight: 600 }}>
          Admin console
        </h1>
        <div className="a-field">
          <label htmlFor="a-pw">Password</label>
          <input
            id="a-pw"
            type="password"
            className="a-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <div className="a-error">{error}</div>}
        </div>
        <button type="submit" className="a-btn a-btn-primary" disabled={!password || busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
