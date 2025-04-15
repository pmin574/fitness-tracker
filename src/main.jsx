import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
// import { initializeAppCheckForEnv } from "./firebase/appCheck";

// Temporarily disable App Check until we resolve the authentication issues
/*
if (
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
) {
  initializeAppCheckForEnv();
}
*/

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
