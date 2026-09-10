'use client'

import { useState } from 'react'

export default function RefundButton({ orderId, paymentIntentId }: { orderId: string, paymentIntentId: string }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleRefund = async () => {
    if (!window.confirm('Are you sure you want to issue a full refund for this order?')) return

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, paymentIntentId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process refund')
      }

      setMessage('Refund processed successfully!')
      window.location.reload()
    } catch (err: any) {
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button 
        onClick={handleRefund} 
        disabled={loading}
        style={{
          background: '#dc2626',
          color: '#fff',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600
        }}
      >
        {loading ? 'Processing...' : 'Issue Refund'}
      </button>
      {message && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{message}</p>}
    </div>
  )
}
