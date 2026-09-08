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

      setMessage({ text: 'Profile photo updated successfully!', type: 'success' })
    } catch (error: any) {
      setMessage({ text: error.message || 'Error uploading image.', type: 'error' })
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
      setMessage({ text: 'Profile updated successfully!', type: 'success' })
      setUpdatedAt(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
      setIsEditing(false)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1rem', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', color: '#262626', background: '#fafafa', minHeight: '100vh', boxSizing: 'border-box' }}>
      
      {/* Navigation Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
        <Link href="/admin/dashboard" style={{ color: '#0095f6', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ← Back to Dashboard
        </Link>
        <span style={{ fontSize: '0.78rem', color: '#8e8e8e', background: '#efefef', padding: '0.3rem 0.7rem', borderRadius: '12px', fontWeight: 500 }}>
          {updatedAt ? `Synced ${updatedAt}` : 'Active Session'}
        </span>
      </div>

      {/* Main Instagram Profile Card */}
      <div style={{ background: '#fff', border: '1px solid #dbdbdb', borderRadius: '16px', padding: '2rem 2.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', boxSizing: 'border-box', width: '100%' }}>
        
        {/* Status Notification */}
        {message.text && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', background: message.type === 'error' ? '#ffeded' : '#e6f4ea', color: message.type === 'error' ? '#c53030' : '#137333', border: `1px solid ${message.type === 'error' ? '#f5c6cb' : '#c3e6cb'}` }}>
            {message.text}
          </div>
        )}

        {/* IG Header Profile Flex Box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap', marginBottom: '1.8rem' }}>
          
          {/* Story-ring Gradient Avatar Container */}
          <div 
            onClick={() => avatarUrl && setShowLightbox(true)}
            style={{ 
              width: '100px', height: '100px', borderRadius: '50%', 
              background: 'linear-gradient(450deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', 
              padding: '3px', cursor: avatarUrl ? 'zoom-in' : 'default', flexShrink: 0,
              boxShadow: '0 6px 16px rgba(220, 39, 67, 0.15)', transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => { if(avatarUrl) e.currentTarget.style.transform = 'scale(1.03)' }}
            onMouseOut={(e) => { if(avatarUrl) e.currentTarget.style.transform = 'scale(1)' }}
            title={avatarUrl ? "Click to view full image" : ""}
          >
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '2rem', fontWeight: 700, color: '#262626' }}>
                  {fullName ? fullName.charAt(0).toUpperCase() : 'P'}
                </span>
              )}
            </div>
          </div>

          {/* User Meta & Action Buttons */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 400, color: '#262626', letterSpacing: '-0.3px' }}>
                {fullName || 'Anonymous Admin'} <span style={{ color: '#0095f6', fontSize: '1rem' }}>✔</span>
              </h1>

              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  style={{ padding: '0.45rem 1.1rem', background: '#efefef', color: '#262626', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#dbdbdb'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#efefef'}
                >
                  Edit profile
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(false)}
                  style={{ padding: '0.45rem 1.1rem', background: '#ed4956', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              )}
            </div>

            {/* IG Stats Row */}
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: '#262626', marginBottom: '0.8rem' }}>
              <div><strong style={{ fontWeight: 600 }}>Admin</strong> role</div>
              <div><strong style={{ fontWeight: 600 }}>Secured</strong> account</div>
              <div><strong style={{ fontWeight: 600 }}>Online</strong> status</div>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#8e8e8e' }}>
              {user?.email || 'Loading email...'}
            </div>
          </div>

        </div>

        {/* Bio Section */}
        <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #efefef', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 0.4rem 0', fontSize: '0.9rem', fontWeight: 600, color: '#262626' }}>{fullName}</p>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#262626', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
            {bio || 'No bio added yet. Click edit profile to tell visitors about yourself.'}
          </p>
        </div>

        {/* Edit Form (Collapsible/Conditional) */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ background: '#fafafa', padding: '1.2rem', borderRadius: '12px', border: '1px solid #dbdbdb' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#262626', marginBottom: '0.4rem' }}>Change Profile Photo</label>
              <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploading || !user} style={{ fontSize: '0.82rem', color: '#555' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#262626', marginBottom: '0.3rem' }}>Full Name</label>
              <input 
                type="text" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #dbdbdb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: '#fafafa', boxSizing: 'border-box' }} 
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#262626' }}>Bio</label>
                <span style={{ fontSize: '0.72rem', color: '#8e8e8e' }}>{bio.length}/250</span>
              </div>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                maxLength={250} 
                rows={3} 
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #dbdbdb', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', resize: 'vertical', background: '#fafafa', boxSizing: 'border-box' }} 
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              style={{ width: '100%', padding: '0.7rem', background: '#0095f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = '#1877f2'}
              onMouseOut={(e) => e.currentTarget.style.background = '#0095f6'}
            >
              {loading ? 'Saving...' : 'Submit Changes'}
            </button>
          </form>
        )}

      </div>

      {/* Instagram-Style Image Lightbox Modal */}
      {showLightbox && (
        <div 
          onClick={() => setShowLightbox(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ background: '#000', borderRadius: '12px', maxWidth: '450px', width: '100%', overflow: 'hidden', textAlign: 'center', position: 'relative', border: '1px solid #333', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #222' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>Profile Photo</span>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ width: '100%', maxHeight: '450px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <img src={avatarUrl} alt="Enlarged Avatar" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '4px' }} />
            </div>

            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #222', display: 'flex', gap: '0.75rem' }}>
              <a 
                href={avatarUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ flex: 1, padding: '0.65rem', background: '#262626', color: '#fff', border: 'none', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center' }}
              >
                Open Original File ↗
              </a>
              <button 
                onClick={() => setShowLightbox(false)}
                style={{ flex: 1, padding: '0.65rem', background: '#0095f6', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
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
