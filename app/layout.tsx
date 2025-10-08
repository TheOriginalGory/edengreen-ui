// app/layout.tsx

import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Cinzel } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { AuthProvider } from "@/context/AuthContext" // Importamos el AuthProvider
import "./globals.css"
import { Toaster } from "@/components/ui/sonner" // Importamos Sonner para notificaciones

const cinzel = Cinzel({
    subsets: ["latin"],
    weight: ["400", "700", "900"],
    variable: "--font-cinzel",
    display: "swap",
})

export const metadata: Metadata = {
    title: "SIARI - Agricultural AI Assistant",
    description: "Your intelligent agricultural assistant powered by AI",
    generator: "v0.app",
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="es" suppressHydrationWarning className="overflow-hidden h-full">
            <body
                className={`font-sans ${GeistSans.variable} ${GeistMono.variable} ${cinzel.variable} antialiased overflow-hidden h-full m-0`}
            >
                <AuthProvider> {/* Envolvemos todo con AuthProvider */}
                    <Suspense fallback={null}>
                        {children}
                        <Analytics />
                        <Toaster position="top-center" richColors /> {/* Añadimos el componente de notificaciones */}
                    </Suspense>
                </AuthProvider>
            </body>
        </html>
    )
}