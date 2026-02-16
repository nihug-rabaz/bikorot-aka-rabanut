import withPWA from "@ducanh2912/next-pwa"

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    return config
  },
}

const runtimeCaching = [
  {
    handler: "StaleWhileRevalidate",
    urlPattern: ({ request }) =>
      request.destination === "document" ||
      request.destination === "script" ||
      request.destination === "style",
    options: {
      cacheName: "pages-and-assets",
    },
  },
  {
    handler: "StaleWhileRevalidate",
    urlPattern: ({ url }) => url.pathname.startsWith("/audit") || url.pathname.startsWith("/audits"),
    options: {
      cacheName: "audit-routes",
    },
  },
]

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  workboxOptions: {
    clientsClaim: true,
    skipWaiting: true,
    runtimeCaching,
  },
})(nextConfig)