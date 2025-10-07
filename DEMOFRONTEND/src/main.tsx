import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Fade out loader smoothly
const loader = document.getElementById("initial-loader");
if (loader) {
  loader.style.transition = "opacity 0.5s ease";
  loader.style.opacity = "0";
  setTimeout(() => loader.remove(), 500);
}
