import path from "path"
import {VitePWA} from "vite-plugin-pwa"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import {defineConfig} from "vite"

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: [
                'offline.html',
                "favicon.ico",
                "manifest.webmanifest",
                "static/sprocket_logo_ring.png",
                "static/sprocket_logo_gear.png",
            ],
            manifest: {
                name: "Your App Name",
                short_name: "App",
                start_url: "/",
                display: "standalone",
                background_color: "#000000",
                theme_color: "#000000",
                icons: [
                    {
                        src: "/pwa/sprocket_logo_128.png",
                        sizes: "128x128",
                        type: "image/png",
                    },
                    {
                        src: "/pwa/sprocket_logo_192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/pwa/sprocket_logo_256.png",
                        sizes: "256x256",
                        type: "image/png",
                    },
                    {
                        src: "/pwa/sprocket_logo_512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
            workbox: {
                // Fallback to index.html for navigation requests (React Router)
                navigateFallback: "/splash.html",
                globIgnores: ['**/teams/team_icons/**'],
                // Keep offline.html as a real offline fallback if you want
                runtimeCaching: [
                    {
                        urlPattern: ({request}) => request.mode === 'navigate',
                        handler: 'NetworkFirst',
                        options: {
                            networkTimeoutSeconds: 3,
                        },
                    },
                ],
                globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
            },
        })

    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        host: true,
    },
})

