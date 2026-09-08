'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
        if (data) setFullName(data.full_name || '')
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      updated_at: new Date(),
    })

    if (error) {
      setMessage(`Error updating profile: ${error.message}`)
    } else {
      setMessage('Profile updated successfully!')
    }
    setUpdating(false)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading profile...</div>

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500, display: 'inline-block', marginBottom: '1rem' }}>← Back Home</Link>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2rem' }}>
        <h1 style={{ marginTop: 0, fontSize: '1.5rem' }}>User Profile</h1>
        
        {message && <div style={{ padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>{message}</div>}

        <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }}
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={updating}
            style={{ padding: '0.7rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
          >
            {updating ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
