import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  // ✅ IMPORTANT: app is served from /dist/
  base: "/dist/",

  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon.png",
      ],

      manifest: {
        name: "ISP Ops Dashboard",
        short_name: "ISP Dashboard",
        description: "Operations & metrics at a glance.",
        theme_color: "#0B1020",
        background_color: "#0A0F1E",
        display: "standalone",

        // ✅ IMPORTANT: scope + start_url must match /dist/
        scope: "/dist/",
        start_url: "/dist/",

        icons: [
          { src: "/dist/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/dist/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/dist/pwa-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        // ✅ IMPORTANT: fallback must also be under /dist/
        navigateFallback: "/dist/index.html",

        runtimeCaching: [
          {
            // ✅ Match your actual API paths (/API and /OCR)
            // ✅ Cache only GET requests (avoid caching login POST responses)
            urlPattern: ({ url, request }) =>
              (url.pathname.startsWith("/API/") ||
                url.pathname.startsWith("/OCR/")) &&
              request.method === "GET",
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 10 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) =>
              ["style", "script", "worker", "image", "font"].includes(
                request.destination
              ),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "static-assets",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },

      // ✅ avoid SW caching headaches during dev
      devOptions: {
        enabled: false,
      },
    }),
  ],

  // ✅ Dev only (safe to keep)
  server: {
    proxy: {
      "/API": {
        target: "https://skizagroundsuite.com",
        changeOrigin: true,
        secure: false,
      },
      "/OCR": {
        target: "https://skizagroundsuite.com",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
