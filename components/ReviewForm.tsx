'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setMessage('Please log in to leave a review.')
      setIsSubmitting(false)
      return
    }

    const { error } = await supabase.from('reviews').insert([
      {
        product_id: productId,
        user_id: user.id,
        rating,
        comment,
      },
    ])

    if (error) {
      setMessage('Failed to submit review. Try again.')
    } else {
      setMessage('Review submitted successfully!')
      setComment('')
      router.refresh()
    }
    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2dad0', marginTop: '1.5rem' }}>
      <h3 style={{ fontFamily: 'serif', fontSize: '1.25rem', marginBottom: '1rem', color: '#1f1815' }}>Write a Review</h3>
      
      {message && <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: message.includes('success') ? 'green' : '#b06d50' }}>{message}</p>}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: '#786e65' }}>Rating</label>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2dad0', background: '#fff' }}>
          <option value={5}>5 Stars - Excellent</option>
          <option value={4}>4 Stars - Good</option>
          <option value={3}>3 Stars - Average</option>
          <option value={2}>2 Stars - Poor</option>
          <option value={1}>1 Star - Terrible</option>
        </select>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: '#786e65' }}>Comment</label>
        <textarea required rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience..." style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2dad0', resize: 'vertical' }} />
      </div>

      <button type="submit" disabled={isSubmitting} style={{ width: '100%', background: '#1f1815', color: '#fff', border: 'none', padding: '0.65rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}