'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  
  // UI States
  const [isEditing, setIsEditing] = useState(false)
  const [showLightbox, setShowLightbox] = useState(false)
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
        if (data.updated_at) {
          setUpdatedAt(new Date(data.updated_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          }))
        }
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

      if (!user) throw new Error('User session not loaded yet.')
      if (!e.target.files || e.target.files.length === 0) return

      const file = e.target.files[0]
      const localPreviewUrl = URL.createObjectURL(file)
      setAvatarUrl(localPreviewUrl)

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      if (data?.publicUrl) setAvatarUrl(data.publicUrl)

      setMessage({ text: 'Avatar updated successfully!', type: 'success' })
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

    const now = new Date().toISOString()
    const updates: any = {
      id: user.id,
      email: user.email,
      full_name: fullName,
      bio: bio,
      updated_at: now,
    }

    if (avatarUrl) updates.avatar_url = avatarUrl

    const { error } = await supabase.from('profiles').upsert(updates)

    if (error) {
      setMessage({ text: `Error updating profile: ${error.message}`, type: 'error' })
    } else {
      setMessage({ text: 'Profile saved successfully!', type: 'success' })
      setUpdatedAt(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
      setIsEditing(false)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100%', maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a', background: '#f8fafc', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Link href="/admin/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'opacity 0.2s' }}>
          ← Back to Dashboard
        </Link>
        {!isEditing && !loading && (
          <button 
            onClick={() => setIsEditing(true)}
            style={{ padding: '0.5rem 1rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
            onMouseOut={(e) => e.currentTarget.style.background = '#0f172a'}
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>

      {/* Main Card Container */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '2rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.03), 0 4px 6px -4px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%', position: 'relative' }}>
        
        {/* Header Section */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Admin Profile</h1>
            <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {isEditing ? 'Make changes to your public profile details.' : 'View your account credentials and public identity.'}
            </p>
          </div>
          {updatedAt && (
            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '0.25rem 0.6rem', borderRadius: '20px', fontWeight: 500 }}>
              Updated {updatedAt}
            </span>
          )}
        </div>

        {/* Status Message Alert */}
        {message.text && (
          <div style={{ padding: '0.8rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.84rem', background: message.type === 'error' ? '#fef2f2' : '#f0fdf4', color: message.type === 'error' ? '#991b1b' : '#166534', border: `1px solid ${message.type === 'error' ? '#fecaca' : '#bbf7d0'}`, animation: 'fadeIn 0.3s ease' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Avatar Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap', background: '#f8fafc', padding: '1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            
            {/* Clickable Avatar Thumbnail */}
            <div 
              onClick={() => avatarUrl && setShowLightbox(true)}
              style={{ width: '75px', height: '75px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', cursor: avatarUrl ? 'zoom-in' : 'default', flexShrink: 0, position: 'relative', transition: 'transform 0.2s' }}
              title={avatarUrl ? "Click to enlarge" : ""}
              onMouseOver={(e) => { if(avatarUrl) e.currentTarget.style.transform = 'scale(1.04)' }}
              onMouseOut={(e) => { if(avatarUrl) e.currentTarget.style.transform = 'scale(1)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64748b' }}>
                  {fullName ? fullName.charAt(0).toUpperCase() : '?'}
                </span>
              )}
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Profile Picture</label>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>(Click image to zoom)</span>
              </div>
              <p style={{ margin: '0.2rem 0 0.6rem 0', fontSize: '0.78rem', color: '#64748b' }}>
                {isEditing ? 'Upload a square PNG or JPG image up to 2MB.' : 'Your official profile avatar.'}
              </p>

              {isEditing && (
                <label style={{ display: 'inline-block', padding: '0.45rem 1rem', background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)', transition: 'background 0.2s' }}>
                  {uploading ? 'Uploading...' : 'Choose New Image'}
                  <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || !user} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          {/* Full Name Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="Enter your full name" 
              disabled={!isEditing}
              required 
              style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '9px', fontSize: '0.9rem', outline: 'none', background: isEditing ? '#fff' : '#f8fafc', color: isEditing ? '#0f172a' : '#334155', boxSizing: 'border-box', transition: 'border-color 0.2s' }} 
              onFocus={(e) => { if(isEditing) e.currentTarget.style.borderColor = '#2563eb' }}
              onBlur={(e) => { if(isEditing) e.currentTarget.style.borderColor = '#cbd5e1' }}
            />
          </div>

          {/* Email Display (Read-only security field) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>Email Address</label>
            <input 
              type="email" 
              value={user?.email || ''} 
              disabled 
              style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #e2e8f0', borderRadius: '9px', fontSize: '0.9rem', outline: 'none', background: '#f1f5f9', color: '#64748b', boxSizing: 'border-box', cursor: 'not-allowed' }} 
            />
            <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>Email address is tied to your authentication account and cannot be modified here.</span>
          </div>

          {/* Bio / Description Field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#334155' }}>Bio / Description</label>
              {isEditing && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{bio.length}/250</span>}
            </div>
            <textarea 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              maxLength={250} 
              disabled={!isEditing}
              placeholder="Briefly describe your role or background..." 
              rows={3} 
              style={{ width: '100%', padding: '0.7rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '9px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', background: isEditing ? '#fff' : '#f8fafc', color: isEditing ? '#0f172a' : '#334155', boxSizing: 'border-box', transition: 'border-color 0.2s' }} 
              onFocus={(e) => { if(isEditing) e.currentTarget.style.borderColor = '#2563eb' }}
              onBlur={(e) => { if(isEditing) e.currentTarget.style.borderColor = '#cbd5e1' }}
            />
          </div>

          {/* Action Buttons (Only visible when editing) */}
          {isEditing && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', animation: 'fadeIn 0.2s ease' }}>
              <button 
                type="submit" 
                disabled={loading} 
                style={{ flex: 1, padding: '0.75rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '9px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
                onMouseOut={(e) => e.currentTarget.style.background = '#0f172a'}
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsEditing(false)}
                style={{ padding: '0.75rem 1.25rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '9px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                Cancel
              </button>
            </div>
          )}

        </form>
      </div>

      {/* Lightbox Modal for Enlarged Avatar Preview */}
      {showLightbox && (
        <div 
          onClick={() => setShowLightbox(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', animation: 'fadeIn 0.2s ease' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', maxWidth: '400px', width: '100%', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', position: 'relative' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Profile Picture Preview</h3>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '30px', height: '30px', fontWeight: 700, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src={avatarUrl} alt="Enlarged Avatar" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a 
                href={avatarUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ flex: 1, padding: '0.6rem', background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.82rem', textAlign: 'center' }}
              >
                Open Original ↗
              </a>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ flex: 1, padding: '0.6rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
