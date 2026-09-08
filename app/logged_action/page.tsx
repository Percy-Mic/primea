'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoggedActionPage() {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()

    const fetchLogs = async () => {
      const { data } = await supabase
        .from('logged_actions')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setLogs(data)
    }
    fetchLogs()

    // Real-time synchronization
    const channel = supabase
      .channel('logged-actions-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logged_actions' },
        (payload) => {
          setLogs((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Logged Actions (Real-Time Feed)</h1>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>← Back Home</Link>
      </div>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
        {logs.length === 0 ? (
          <p style={{ color: '#64748b' }}>No actions recorded yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.map((log) => (
              <li key={log.id} style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.action_name || 'Action Triggered'}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
