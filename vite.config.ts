import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export const BASE_PATH = "/Touchline/";

export default defineConfig({
  base: BASE_PATH,
  plugins: [react()],
});
