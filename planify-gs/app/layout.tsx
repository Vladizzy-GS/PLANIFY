import type { Metadata } from 'next'
import { Inter, Syne } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const syne = Syne({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-syne' })

export const metadata: Metadata = {
  title: 'Planify · GS',
  description: 'Gestion équipe — Planify GS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${syne.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
