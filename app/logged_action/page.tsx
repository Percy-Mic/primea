'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoggedActionPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'logs'>('chat')

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrlPreview, setAudioUrlPreview] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTab])

  // Auto-expand textarea
  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  // Voice Recorder Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        setAudioUrlPreview(URL.createObjectURL(audioBlob))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      alert('Microphone access denied or unavailable.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setAudioBlob(null)
    setAudioUrlPreview(null)
    setRecordingTime(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !audioBlob) || !user) return

    let uploadedAudioUrl = null
    let duration = recordingTime

    if (audioBlob) {
      const fileName = `voice_${user.id}_${Date.now()}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-audio')
        .upload(fileName, audioBlob)

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('chat-audio')
          .getPublicUrl(fileName)
        uploadedAudioUrl = publicUrlData.publicUrl
      }
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    
    await supabase.from('messages').insert([{
      sender_id: user.id,
      sender_name: profile?.full_name || user.email,
      sender_avatar: profile?.avatar_url || '',
      message: newMessage.trim(),
      audio_url: uploadedAudioUrl,
      audio_duration: duration,
    }])

    setNewMessage('')
    setAudioBlob(null)
    setAudioUrlPreview(null)
    setRecordingTime(0)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>Admin Hub & Group Chat</h1>
        <Link href="/admin/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500, fontSize: '0.9rem' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setActiveTab('chat')} style={{ padding: '0.5rem 1rem', background: activeTab === 'chat' ? '#0f172a' : '#e2e8f0', color: activeTab === 'chat' ? '#fff' : '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Admin Group Chat</button>
        <button onClick={() => setActiveTab('logs')} style={{ padding: '0.5rem 1rem', background: activeTab === 'logs' ? '#0f172a' : '#e2e8f0', color: activeTab === 'logs' ? '#fff' : '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>System Activity Log</button>
      </div>

      {activeTab === 'chat' ? (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '550px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          
          {/* Chat Stream Area */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc' }}>
            {messages.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', margin: 'auto', fontSize: '0.9rem' }}>No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '0.5rem' }}>
                    
                    {/* Other user avatar */}
                    {!isMe && (
                      msg.sender_avatar ? (
                        <img src={msg.sender_avatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginBottom: '2px' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
                          {msg.sender_name?.[0] || 'U'}
                        </div>
                      )
                    )}

                    <div style={{ maxWidth: '75%', background: isMe ? '#2563eb' : '#fff', color: isMe ? '#fff' : '#1e293b', padding: '0.65rem 0.9rem', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: isMe ? 'none' : '1px solid #e2e8f0' }}>
                      
                      {!isMe && <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#2563eb', marginBottom: '0.2rem' }}>{msg.sender_name}</div>}

                      {msg.message && <div style={{ fontSize: '0.9rem', wordBreak: 'break-word', lineHeight: 1.4 }}>{msg.message}</div>}

                      {msg.audio_url && (
                        <div style={{ marginTop: msg.message ? '0.5rem' : 0 }}>
                          <audio controls src={msg.audio_url} style={{ height: '32px', width: '100%', maxWidth: '210px', accentColor: isMe ? '#fff' : '#2563eb' }} />
                        </div>
                      )}

                      <div style={{ fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.8)' : '#94a3b8', textAlign: 'right', marginTop: '0.2rem' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Chat Input & Recorder Toolbar */}
          <form onSubmit={handleSendMessage} style={{ padding: '0.75rem 1rem', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            
            {isRecording ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '24px', padding: '0.4rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b91c1c' }}>Recording: {Math.floor(recordingTime / 60)}:{('0' + (recordingTime % 60)).slice(-2)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={cancelRecording} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Cancel</button>
                  <button type="button" onClick={stopRecording} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '16px', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Done</button>
                </div>
              </div>
            ) : audioUrlPreview ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', borderRadius: '24px', padding: '0.3rem 0.75rem' }}>
                <audio controls src={audioUrlPreview} style={{ height: '30px', width: '100%', maxWidth: '220px' }} />
                <button type="button" onClick={cancelRecording} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Discard</button>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder="Type a message..."
                value={newMessage}
                onChange={handleInputResize}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
                style={{ flex: 1, resize: 'none', maxHeight: '120px', padding: '0.65rem 1rem', border: '1px solid #cbd5e1', borderRadius: '20px', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit', background: '#f8fafc', lineHeight: 1.4 }}
              />
            )}

            {!isRecording && !audioUrlPreview && (
              <button
                type="button"
                onClick={startRecording}
                title="Record voice note"
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
              </button>
            )}

            <button 
              type="submit" 
              disabled={!newMessage.trim() && !audioBlob}
              style={{ background: (!newMessage.trim() && !audioBlob) ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!newMessage.trim() && !audioBlob) ? 'default' : 'pointer', flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem' }}>
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
