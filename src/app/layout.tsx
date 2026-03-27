import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/providers'

export const metadata: Metadata = {
  title: 'CCS Center — Gestión de Gimnasio',
  description: 'Panel de administración interno de CCS Center',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-slate-900 text-slate-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
