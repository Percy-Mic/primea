'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ text: '', type: '' })

  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      setUser(user)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setFullName(data.full_name || '')
        setBio(data.bio || '')
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
      } else if (error) {
        console.warn('Profile fetch warning:', error.message)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      setMessage({ text: '', type: '' })

      if (!user) {
        throw new Error('User session not loaded yet. Please wait a moment.')
      }

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = e.target.files[0]
      
      // Instant local preview
      const localPreviewUrl = URL.createObjectURL(file)
      setAvatarUrl(localPreviewUrl)

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      if (data?.publicUrl) {
        setAvatarUrl(data.publicUrl)
      }

      setMessage({ text: 'Avatar uploaded successfully!', type: 'success' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Error uploading avatar.', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage({ text: '', type: '' })

    const updates: any = {
      id: user.id,
      email: user.email, // Required by database constraint
      full_name: fullName,
      bio: bio,
      updated_at: new Date().toISOString(),
    }

    if (avatarUrl) {
      updates.avatar_url = avatarUrl
    }

    const { error } = await supabase.from('profiles').upsert(updates)

    if (error) {
      setMessage({ text: `Error updating profile: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Profile updated successfully!', type: 'success' })
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100%', maxWidth: '650px', margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', background: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <Link href="/admin/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }}>
        
        <div style={{ marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Admin Profile Settings</h1>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Manage your account details, bio, and profile picture.</p>
        </div>

        {message.text && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.82rem', background: message.type === 'error' ? '#fef2f2' : '#f0fdf4', color: message.type === 'error' ? '#991b1b' : '#166534', border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`, wordBreak: 'break-word' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Avatar Preview & Professional Upload Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ width: '65px', height: '65px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: '#64748b' }}>
                  {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '180px', overflow: 'hidden' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>Profile Picture</label>
              
              <label style={{ display: 'inline-block', padding: '0.45rem 0.9rem', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', textAlign: 'center' }}>
                {uploading ? 'Uploading...' : 'Choose Image'}
                <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || !user} style={{ display: 'none' }} />
              </label>

              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', marginTop: '0.3rem' }}>Square PNG, JPG up to 2MB.</span>
            </div>
          </div>

          {/* Full Name Input */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" required style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Bio Textarea */}
          <div style={{ width: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Bio / Description</label>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{bio.length}/250</span>
            </div>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={250} placeholder="Briefly describe your role or background..." rows={3} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading || !user} style={{ width: '100%', padding: '0.7rem 1.25rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer', boxSizing: 'border-box' }}>
            {loading ? 'Saving Changes...' : 'Save Profile'}
          </button>

        </form>
      </div>
    </div>
  )
}
