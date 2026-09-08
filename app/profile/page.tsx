'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setFullName(data.full_name || '')
          setAvatarUrl(data.avatar_url || '')
        }
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

    let finalAvatarUrl = avatarUrl

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile, { upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
        finalAvatarUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      email: user.email,
      avatar_url: finalAvatarUrl,
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Profile updated successfully!')
      setAvatarUrl(finalAvatarUrl)
    }
    setUpdating(false)
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading profile...</div>

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500, display: 'inline-block', marginBottom: '1rem' }}>← Back Home</Link>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2rem' }}>
        <h1 style={{ marginTop: 0, fontSize: '1.5rem' }}>Admin Profile Settings</h1>
        
        {message && <div style={{ padding: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>{message}</div>}

        <form onSubmit={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }} />
            ) : (
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>?</div>
            )}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>Change Profile Picture</label>
              <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} style={{ fontSize: '0.8rem' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ padding: '0.65rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} required />
          </div>

          <button type="submit" disabled={updating} style={{ padding: '0.7rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
            {updating ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
