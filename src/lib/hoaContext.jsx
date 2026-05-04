import { createContext, useContext } from "react";

// Provides the active HOA (slug, name, address, branding) plus derived URLs
// so deeply-nested resident components can read tenant data without prop
// drilling.

const HoaContext = createContext(null);

export function HoaProvider({ hoa, children }) {
  return <HoaContext.Provider value={hoa}>{children}</HoaContext.Provider>;
}

export function useHoa() {
  const ctx = useContext(HoaContext);
  if (!ctx) throw new Error("useHoa must be used inside <HoaProvider>");
  return ctx;
}
