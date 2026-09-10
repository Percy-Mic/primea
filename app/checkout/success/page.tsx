'use client'

import Link from 'next/link'

export default function CheckoutSuccessPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f2eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'serif',
        color: '#1f1815',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          background: '#ffffff',
          padding: '3rem 2rem',
          borderRadius: '8px',
          border: '1px solid #e2dad0',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 'normal', marginBottom: '0.5rem' }}>
          Thank You
        </h1>
        <p style={{ fontFamily: 'sans-serif', color: '#666', fontSize: '0.95rem', marginBottom: '2rem' }}>
          Your PRIMEA order has been placed successfully. A confirmation email has been sent.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: '#1f1815',
            color: '#ffffff',
            padding: '0.85rem 2rem',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
          }}
        >
          Return to Storefront
        </Link>
      </div>
    </div>
  )
}
