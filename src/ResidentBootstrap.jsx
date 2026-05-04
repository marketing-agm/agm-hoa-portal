import { useEffect, useState } from "react";
import { apiGet } from "./lib/api.js";
import QueensCourtPortal from "./QueensCourtPortal.jsx";

export default function ResidentBootstrap({ slug }) {
  const [hoa, setHoa] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setError("missing");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet(`/api/hoas/${encodeURIComponent(slug)}`);
        if (!cancelled) setHoa(res.hoa);
      } catch (err) {
        if (!cancelled) setError(err.status === 404 ? "notfound" : err.message || "error");
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (error) return <NotFound slug={slug} reason={error} />;
  if (!hoa) return <div style={{ minHeight: "100vh", background: "#faf9f7" }} />;
  return <QueensCourtPortal hoa={hoa} />;
}

function NotFound({ slug, reason }) {
  return (
    <div style={{
      minHeight: "100vh", background: "#faf9f7", display: "grid", placeItems: "center",
      fontFamily: "system-ui, sans-serif", color: "#181818", padding: 24,
    }}>
      <div style={{ maxWidth: 480, textAlign: "center" }}>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9a9a98", marginBottom: 8 }}>
          AGM Real Estate Group
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 12px" }}>
          {reason === "missing" ? "No HOA selected" : "HOA not found"}
        </h1>
        <p style={{ fontSize: 14, color: "#525252", lineHeight: 1.55 }}>
          {reason === "missing"
            ? "Visit the URL your property manager sent you. It looks like /your-hoa-name."
            : <>The portal at <code>/{slug}</code> doesn't exist (yet). Check the URL or contact AGM.</>}
        </p>
      </div>
    </div>
  );
}
