import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // The panel is served from codeboujida.com/admin, not from the root, so every
  // asset URL Vite emits has to carry that prefix — without it index.html asks
  // for /assets/*.js, nginx has nothing there, and the page renders blank.
  // Also feeds import.meta.env.BASE_URL, which the router reads as its basename,
  // so changing this one line moves both the assets and the routes.
  // (Literal rather than an env var: admin has no @types/node, and the mount
  // point is a deployment decision that has to match nginx anyway.)
  base: "/admin/",
});
