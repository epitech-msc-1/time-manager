import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        server: {
            allowedHosts: ["localhost", "127.0.0.1", "::1", "ytlabs.space"],
            hmr: env.VITE_HMR_HOST
                ? {
                      protocol: env.VITE_HMR_PROTOCOL || "wss",
                      host: env.VITE_HMR_HOST,
                      clientPort: Number.parseInt(env.VITE_HMR_PORT || "443"),
                  }
                : undefined,
        },
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
