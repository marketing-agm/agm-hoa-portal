import React from "react";
import ReactDOM from "react-dom/client";
import AdminApp from "./admin/AdminApp.jsx";
import ResidentBootstrap from "./ResidentBootstrap.jsx";

const path = window.location.pathname;
const root = ReactDOM.createRoot(document.getElementById("root"));

if (path === "/admin" || path.startsWith("/admin/")) {
  root.render(
    <React.StrictMode>
      <AdminApp />
    </React.StrictMode>
  );
} else {
  const slug = path.split("/").filter(Boolean)[0] || null;
  root.render(
    <React.StrictMode>
      <ResidentBootstrap slug={slug} />
    </React.StrictMode>
  );
}
