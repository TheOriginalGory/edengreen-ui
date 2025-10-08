/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // 🔹 Permitir conexiones locales seguras
    allowedDevOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.0.101:3000",
      "http://192.168.0.101",
    ],
  },
  async headers() {
    return [
      {
        // 🔹 Permitir CORS entre tu frontend y backend local
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ]
  },
}

export default nextConfig
