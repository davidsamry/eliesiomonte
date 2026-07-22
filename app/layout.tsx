import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ELIESIO MONTE - Agendamentos',
  description: 'Sistema de agendamentos online para a barbearia ELIESIO MONTE',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: [{ color: '#0066FF' }],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background light" style={{ colorScheme: 'light' }}>
      <body className="antialiased bg-background text-foreground" style={{ backgroundColor: '#FAFAFA', color: '#1A1A1A' }}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
