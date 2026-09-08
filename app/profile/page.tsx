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
        setAvatarUrl(data.avatar_url || '')
      } else if (error) {
        // If columns like avatar_url or bio are missing yet, fall back gracefully
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

      if (!e.target.files || e.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage 'avatars' bucket (ensure bucket is created in Supabase)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // If storage bucket isn't set up yet, use local preview object URL as fallback
        console.warn('Storage bucket error, falling back to local preview:', uploadError.message)
        const localUrl = URL.createObjectURL(file)
        setAvatarUrl(localUrl)
        setMessage({ text: 'Image preview loaded locally. Create an "avatars" bucket in Supabase storage for cloud persistence.', type: 'error' })
        setUploading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      setMessage({ text: 'Avatar uploaded successfully!', type: 'success' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Error uploading avatar', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage({ text: '', type: '' })

    const updates = {
      id: user.id,
      full_name: fullName,
      bio: bio,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(updates)

    if (error) {
      setMessage({ text: `Error updating profile: ${error.message}. Ensure columns 'avatar_url' and 'bio' exist in your 'profiles' table.`, type: 'error' })
    } else {
      setMessage({ text: 'Profile updated successfully!', type: 'success' })
    }
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link href="/admin" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ← Back to Dashboard
        </Link>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
        
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>Admin Profile Settings</h1>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Manage your account details, bio, and profile picture.</p>
        </div>

        {message.text && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', background: message.type === 'error' ? '#fef2f2' : '#f0fdf4', color: message.type === 'error' ? '#991b1b' : '#166534', border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}` }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Avatar Preview & Upload Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #cbd5e1', flexShrink: 0 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64748b' }}>
                  {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>Profile Picture</label>
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading} style={{ fontSize: '0.82rem', color: '#475569', width: '100%' }} />
              <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>{uploading ? 'Uploading...' : 'Recommended: Square PNG, JPG up to 2MB.'}</span>
            </div>
          </div>

          {/* Full Name Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" required style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Bio Textarea */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Bio / Description</label>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{bio.length}/250 characters</span>
            </div>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={250} placeholder="Briefly describe your role or background..." rows={3} style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.5rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s', marginTop: '0.5rem' }}>
            {loading ? 'Saving Changes...' : 'Save Profile'}
          </button>

        </form>
      </div>
    </div>
  )
}
