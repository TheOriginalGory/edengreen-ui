/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // El bloque 'experimental' con 'allowedDevOrigins' se eliminó porque
  // esa opción no es reconocida por la versión actual de Next.js.
  // La configuración de CORS para que tu frontend (localhost:3000) pueda
  // hablar con tu backend (localhost:8000) ya la hicimos correctamente
  // en el archivo `api/web.py` del backend (CORSMiddleware).

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" }, // Ojo: en producción, sé más específico.
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ]
  },
}

export default nextConfig