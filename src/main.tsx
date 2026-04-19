import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";
import { PreferencesProvider } from "./lib/preferences";

createRoot(document.getElementById("root")!).render(
  <PreferencesProvider>
    <App />
  </PreferencesProvider>
);
