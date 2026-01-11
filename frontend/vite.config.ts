import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(() => {
    return {
        build: {
            sourcemap: true,
        },
        server: {
            allowedHosts: ["localhost", "127.0.0.1", "::1", "ytlabs.space"],
            hmr: false,
            proxy: {
                "/api": {
                    target: "http://localhost:8000",
                    changeOrigin: true,
                },
            },
        },
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
    };
});
