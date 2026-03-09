import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gluko — AI Diabetes Assistant',
  description: 'AI-powered diabetes management: carb estimation, bolus calculator, and health logging.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
