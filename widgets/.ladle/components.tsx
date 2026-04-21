import type { GlobalProvider } from "@ladle/react";
import "../src/index.css";

export const Provider: GlobalProvider = ({ children }) => (
  <div
    className="min-h-screen w-full bg-surface text-primary antialiased"
    data-theme="dark"
  >
    {children}
  </div>
);
