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
      // 1. Invite user through Supabase Auth (or create user record)
      // Note: In production, use Supabase Server Actions or Admin API to invite via email.
      // Here we simulate profile creation and invitation dispatch.
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

      // Log the audit event
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action_type: 'CREATED_ADMIN',
          description: `Added new admin ${email} with rank ${role}`,
          metadata: { email, role, department }
        })
      }

      onAdminAdded()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create admin account.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.4rem', fontWeight: 700 }}>Add New Administrator</h2>
        <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: '#7a6b63' }}>Assign ranking tier and system permissions for the new team member.</p>

        {error && <div style={{ padding: '0.75rem', background: '#fff5f5', color: '#c53030', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleCreateAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@primea.com" style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Jane Doe" style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Admin Rank</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', background: '#fff' }}>
                <option value="CEO">CEO / Owner</option>
                <option value="Manager">Store Manager</option>
                <option value="Staff">Support Staff</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Department</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #dcd4cc', borderRadius: '8px', boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.25rem', background: '#e3ded6', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" disabled={loading} style={{ padding: '0.75rem 1.25rem', background: '#2c221e', color: '#f5f2eb', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>{loading ? 'Creating...' : 'Create Admin Account'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
