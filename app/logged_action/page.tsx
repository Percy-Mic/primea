'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoggedActionPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat')

  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: logData } = await supabase.from('logged_actions').select('*').order('created_at', { ascending: false })
      if (logData) setLogs(logData)

      const { data: msgData } = await supabase.from('messages').select('*').order('created_at', { ascending: true })
      if (msgData) setMessages(msgData)
    }
    init()

    const channel = supabase
      .channel('chat-and-logs-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logged_actions' }, (payload) => {
        setLogs((prev) => [payload.new, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    
    await supabase.from('messages').insert([{
      sender_id: user.id,
      sender_name: profile?.full_name || user.email,
      sender_avatar: profile?.avatar_url || '',
      message: newMessage,
    }])

    setNewMessage('')
  }

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Admin Hub & Group Chat</h1>
        <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>← Back Home</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setActiveTab('chat')} style={{ padding: '0.5rem 1rem', background: activeTab === 'chat' ? '#0f172a' : '#e2e8f0', color: activeTab === 'chat' ? '#fff' : '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Admin Group Chat</button>
        <button onClick={() => setActiveTab('logs')} style={{ padding: '0.5rem 1rem', background: activeTab === 'logs' ? '#0f172a' : '#e2e8f0', color: activeTab === 'logs' ? '#fff' : '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>System Activity Log</button>
      </div>

      {activeTab === 'chat' ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', height: '500px' }}>
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {messages.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', marginTop: '2rem' }}>No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  {msg.sender_avatar ? (
                    <img src={msg.sender_avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{msg.sender_name?.[0]}</div>
                  )}
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{msg.sender_name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ background: '#f1f5f9', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem', marginTop: '0.2rem', color: '#0f172a' }}>{msg.message}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleSendMessage} style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem' }}>
            <input type="text" placeholder="Type a message to admins..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} style={{ flex: 1, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.9rem' }} />
            <button type="submit" style={{ padding: '0.6rem 1.25rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </form>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {logs.length === 0 ? (
              <p style={{ color: '#64748b' }}>No system actions logged.</p>
            ) : (
              logs.map((log) => (
                <li key={log.id} style={{ padding: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.admin_name} — <span style={{ color: '#2563eb' }}>{log.action_name}</span></div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
