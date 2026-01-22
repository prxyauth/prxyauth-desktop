import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@core": path.resolve(__dirname, "./src/renderer/core"),
            "@shared": path.resolve(__dirname, "./src/renderer/shared"),
            "@features": path.resolve(__dirname, "./src/renderer/features"),
        },
    },
    base: "./",
    server: {
        port: 5180,
    },
    build: {
        outDir: "dist/renderer",
        emptyOutDir: true,
    },
});
