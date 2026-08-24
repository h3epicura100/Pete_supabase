import type { Metadata } from 'next'
import './globals.css'
import Footer from '@/components/ui/footer'

export const metadata: Metadata = {
  icons: {
    icon: '/H3-logo.svg',
  }, 
  title: 'Pete App',
  description: 'Created with Botivate',
  generator: 'Botivate',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen relative pb-16 md:pb-12">
        {children}
        <Footer />
      </body>
    </html>
  )
}
