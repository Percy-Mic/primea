import '@/app/globals.css'
import { CartProvider } from '@/context/CartContext'

export const metadata = {
  title: 'PRIMEA Fashion | High-End Storefront',
  description: 'Built with Next.js, Supabase, and Stripe',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <CartProvider>
          <div className="flex-1">{children}</div>
        </CartProvider>
      </body>
    </html>
  )
}
