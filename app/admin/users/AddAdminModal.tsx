'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AddAdminModal({ onClose, onAdminAdded }: { onClose: () => void, onAdminAdded: () => void }) {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Manager')
  const [department, setDepartment] = useState('Operations')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const tempId = crypto.randomUUID()
      const defaultPermissions = role === 'CEO' 
        ? { all: ['*'] }
        : role === 'Manager' 
        ? { products: ['view', 'create', 'edit'], orders: ['view', 'edit', 'refund'], customers: ['view'] }
        : { orders: ['view'], customers: ['view'] }

      const { error: insertError } = await supabase.from('profiles').insert({
        id: tempId,
        email,
        full_name: fullName,
        role,
        department,
        status: 'Active',
        permissions: defaultPermissions,
        job_title: role === 'CEO' ? 'Chief Executive Officer' : role === 'Manager' ? 'Store Manager' : 'Support Staff'
      })

      if (insertError) throw insertError

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action_type: 'CREATED_ADMIN',
          description: `Added administrator ${email} (${role})`,
          metadata: { email, role, department }
        })
      }

      onAdminAdded()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(18,14,12,0.65)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#ffffff', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 48px rgba(0,0,0,0.15)', border: '1px solid #e6e1da', boxSizing: 'border-box' }}>
        
        <h2 style={{ margin: '0 0 0.4rem 0', fontSize: '1.25rem', fontWeight: 700, color: '#1a1412' }}>Add Administrator</h2>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#6e5f57' }}>Assign system authority tiers and department parameters.</p>

        {error && <div style={{ padding: '0.75rem', background: '#fff5f5', color: '#c53030', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', border: '1px solid #feb2b2' }}>{error}</div>}

        <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>EMAIL ADDRESS</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@primea.com" style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>FULL NAME</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jane Doe" style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>RANK LEVEL</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', outline: 'none' }}>
                <option value="CEO">CEO / Owner</option>
                <option value="Manager">Store Manager</option>
                <option value="Staff">Support Staff</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: '#4a3f39' }}>DEPARTMENT</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1rem', background: '#f3efe6', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', color: '#4a3f39' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.25rem', background: '#1a1412', color: '#f8f6f0', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>{loading ? 'Processing...' : 'Confirm Account'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
