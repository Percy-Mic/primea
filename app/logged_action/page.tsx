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
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // Media Attachment States (Images/Videos)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Active playing audio state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null)
  const [playbackProgress, setPlaybackProgress] = useState<{ [key: string]: number }>({})
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)

  // Message menu state for Unsend
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const supabase = createClient()
  const MIN_MESSAGE_LENGTH = 2

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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => prev.map((msg) => msg.id === payload.new.id ? payload.new : msg))
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logged_actions' }, (payload) => {
        setLogs((prev) => [payload.new, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeTab])

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 50 * 1024 * 1024) {
      alert('File size exceeds 50MB limit.')
      return
    }

    setMediaFile(file)
    setMediaPreviewUrl(URL.createObjectURL(file))
    cancelRecording()
  }

  const clearMediaAttachment = () => {
    setMediaFile(null)
    setMediaPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
      clearMediaAttachment()
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
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
    }
    setIsRecording(false)
    setAudioBlob(null)
    setAudioUrlPreview(null)
    setIsPreviewPlaying(false)
    setRecordingTime(0)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  const togglePreviewAudio = () => {
    if (!audioUrlPreview) return
    if (isPreviewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
        setIsPreviewPlaying(false)
      }
    } else {
      const audio = new Audio(audioUrlPreview)
      previewAudioRef.current = audio
      setIsPreviewPlaying(true)
      audio.onended = () => setIsPreviewPlaying(false)
      audio.play().catch(() => setIsPreviewPlaying(false))
    }
  }

  const togglePlayAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause()
        setPlayingAudioId(null)
      }
    } else {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause()
      }
      const audio = new Audio(url)
      activeAudioRef.current = audio
      setPlayingAudioId(id)

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPlaybackProgress(prev => ({
            ...prev,
            [id]: (audio.currentTime / audio.duration) * 100
          }))
        }
      }

      audio.onended = () => {
        setPlayingAudioId(null)
        setPlaybackProgress(prev => ({ ...prev, [id]: 0 }))
      }

      audio.play().catch(() => setPlayingAudioId(null))
    }
  }

  const handleUnsend = async (messageId: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_unsent: true, message: '', audio_url: null, media_url: null })
      .eq('id', messageId)

    if (error) {
      alert(`Failed to unsend: ${error.message}`)
    }
    setMenuMessageId(null)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedMessage = newMessage.trim()
    
    if (!audioBlob && !mediaFile && trimmedMessage.length > 0 && trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      alert(`Message must be at least ${MIN_MESSAGE_LENGTH} characters long.`)
      return
    }

    if ((!trimmedMessage && !audioBlob && !mediaFile) || !user) return

    let uploadedAudioUrl = null
    let uploadedMediaUrl = null
    let mediaType = null
    let duration = recordingTime

    if (audioBlob) {
      const fileName = `voice_${user.id}_${Date.now()}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-audio')
        .upload(fileName, audioBlob)

      if (uploadError) {
        alert(`Failed to upload audio: ${uploadError.message}`)
        return
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('chat-audio')
          .getPublicUrl(fileName)
        uploadedAudioUrl = publicUrlData.publicUrl
      }
    }

    if (mediaFile) {
      const fileExt = mediaFile.name.split('.').pop()
      const fileName = `media_${user.id}_${Date.now()}.${fileExt}`
      const isVideo = mediaFile.type.startsWith('video/')
      mediaType = isVideo ? 'video' : 'image'

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, mediaFile)

      if (uploadError) {
        alert(`Failed to upload media: ${uploadError.message}`)
        return
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(fileName)
        uploadedMediaUrl = publicUrlData.publicUrl
      }
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    
    const { error: insertError } = await supabase.from('messages').insert([{
      sender_id: user.id,
      sender_name: profile?.full_name || user.email,
      sender_avatar: profile?.avatar_url || '',
      message: trimmedMessage,
      audio_url: uploadedAudioUrl,
      audio_duration: duration,
      media_url: uploadedMediaUrl,
      media_type: mediaType,
      is_unsent: false,
    }])

    if (insertError) {
      alert(`Failed to send message: ${insertError.message}`)
      return
    }

    setNewMessage('')
    setAudioBlob(null)
    setAudioUrlPreview(null)
    setIsPreviewPlaying(false)
    setRecordingTime(0)
    clearMediaAttachment()
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  return (
    <div style={{ maxWidth: '900px', margin: '1.5rem auto', padding: '0 1rem', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' }}>
      <style>{`
        @keyframes wavePulse {
          0%, 100% { height: 6px; }
          50% { height: 24px; }
        }
        .wave-bar {
          width: 3px;
          background-color: currentColor;
          border-radius: 2px;
          animation: wavePulse 1.2s ease-in-out infinite;
        }
        .wave-bar:nth-child(2) { animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { animation-delay: 0.3s; }
        .wave-bar:nth-child(5) { animation-delay: 0.4s; }
      `}</style>

      {/* Header & Tabs - Fixed position outside the fluid chat container */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.3rem', color: '#0f172a' }}>Admin Hub & Group Chat</h1>
        <Link href="/admin/dashboard" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500, fontSize: '0.85rem' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <button onClick={() => setActiveTab('chat')} style={{ padding: '0.4rem 0.9rem', background: activeTab === 'chat' ? '#0f172a' : '#e2e8f0', color: activeTab === 'chat' ? '#fff' : '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>Admin Group Chat</button>
        <button onClick={() => setActiveTab('logs')} style={{ padding: '0.4rem 0.9rem', background: activeTab === 'logs' ? '#0f172a' : '#e2e8f0', color: activeTab === 'logs' ? '#fff' : '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>System Activity Log</button>
      </div>

      {activeTab === 'chat' ? (
        /* LOCKED HEIGHT CONTAINER WITH FIXED HEADER & FOOTER, SCROLLABLE MIDDLE */
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '72vh', minHeight: '500px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
          
          {/* 1. SCROLLABLE CHAT AREA */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', minWidth: 0 }}>
            {messages.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', margin: 'auto', fontSize: '0.9rem' }}>No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_id === user?.id
                const isPlaying = playingAudioId === msg.id

                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '0.5rem', width: '100%', minWidth: 0, position: 'relative' }}>
                    
                    {!isMe && (
                      msg.sender_avatar ? (
                        <img src={msg.sender_avatar} alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginBottom: '2px', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff', marginBottom: '2px', flexShrink: 0 }}>
                          {msg.sender_name?.[0] || 'U'}
                        </div>
                      )
                    )}

                    <div style={{ maxWidth: '85%', width: '100%', minWidth: 0, background: msg.is_unsent ? 'transparent' : (isMe ? '#2563eb' : '#fff'), color: isMe ? '#fff' : '#1e293b', padding: msg.is_unsent ? '0.2rem' : '0.65rem 0.9rem', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', boxShadow: msg.is_unsent ? 'none' : '0 1px 2px rgba(0,0,0,0.05)', border: msg.is_unsent || isMe ? 'none' : '1px solid #e2e8f0', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
                      
                      {msg.is_unsent ? (
                        <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#94a3b8', padding: '0.2rem 0' }}>
                          {isMe ? 'You unsent a message' : `${msg.sender_name} unsent a message`}
                        </div>
                      ) : (
                        <>
                          {!isMe && <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#2563eb', marginBottom: '0.2rem' }}>{msg.sender_name}</div>}

                          {msg.media_url && (
                            <div style={{ marginBottom: msg.message ? '0.5rem' : 0, borderRadius: '8px', overflow: 'hidden', maxWidth: '100%' }}>
                              {msg.media_type === 'video' ? (
                                <video controls src={msg.media_url} style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                              ) : (
                                <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                                  <img src={msg.media_url} alt="Attached media" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                                </a>
                              )}
                            </div>
                          )}

                          {msg.message && <div style={{ fontSize: '0.9rem', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: 1.4 }}>{msg.message}</div>}

                          {msg.audio_url && (
                            <div style={{ marginTop: (msg.message || msg.media_url) ? '0.5rem' : 0, display: 'flex', alignItems: 'center', gap: '0.75rem', background: isMe ? 'rgba(0,0,0,0.1)' : '#f1f5f9', padding: '0.4rem 0.75rem', borderRadius: '20px', width: '100%', boxSizing: 'border-box' }}>
                              <button
                                type="button"
                                onClick={() => togglePlayAudio(msg.id, msg.audio_url)}
                                style={{ background: isMe ? '#fff' : '#2563eb', color: isMe ? '#2563eb' : '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                              >
                                {isPlaying ? (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                                ) : (
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                )}
                              </button>

                              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '3px', height: '24px', overflow: 'hidden' }}>
                                {[4, 12, 18, 8, 15, 22, 10, 18, 12, 6].map((h, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      width: '3px',
                                      height: isPlaying ? `${Math.max(6, (h * (1 + Math.sin(i + Date.now() / 200))))}px` : `${h}px`,
                                      backgroundColor: isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                                      borderRadius: '2px',
                                      transition: 'height 0.2s ease',
                                      flexShrink: 0
                                    }}
                                  />
                                ))}
                              </div>

                              <span style={{ fontSize: '0.7rem', color: isMe ? 'rgba(255,255,255,0.9)' : '#64748b', minWidth: '32px', textAlign: 'right', flexShrink: 0 }}>
                                {msg.audio_duration ? `${Math.floor(msg.audio_duration / 60)}:${('0' + (msg.audio_duration % 60)).slice(-2)}` : '0:00'}
                              </span>
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                            <span style={{ fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.8)' : '#94a3b8' }}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {isMe && !msg.is_unsent && (
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setMenuMessageId(menuMessageId === msg.id ? null : msg.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px', fontSize: '1rem', fontWeight: 'bold' }}
                          title="Message options"
                        >
                          ⋮
                        </button>
                        {menuMessageId === msg.id && (
                          <div style={{ position: 'absolute', right: 0, bottom: '100%', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', zIndex: 10, whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              onClick={() => handleUnsend(msg.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, width: '100%', textAlign: 'left' }}
                            >
                              Unsend
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 2. FIXED ATTACHMENT PREVIEW */}
          {mediaPreviewUrl && (
            <div style={{ padding: '0.5rem 1rem', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                {mediaFile?.type.startsWith('video/') ? (
                  <video src={mediaPreviewUrl} style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                ) : (
                  <img src={mediaPreviewUrl} alt="Upload preview" style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px' }} />
                )}
                <span style={{ fontSize: '0.8rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{mediaFile?.name}</span>
              </div>
              <button type="button" onClick={clearMediaAttachment} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Remove</button>
            </div>
          )}

          {/* 3. FIXED BOTTOM INPUT BAR */}
          <form onSubmit={handleSendMessage} style={{ padding: '0.75rem 1rem', background: '#fff', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-end', gap: '0.5rem', width: '100%', boxSizing: 'border-box', flexShrink: 0 }}>
            
            {isRecording ? (
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '24px', padding: '0.4rem 1rem', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '24px', flexShrink: 0 }}>
                    <div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" /><div className="wave-bar" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#b91c1c', flexShrink: 0 }}>{Math.floor(recordingTime / 60)}:{('0' + (recordingTime % 60)).slice(-2)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button type="button" onClick={cancelRecording} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Cancel</button>
                  <button type="button" onClick={stopRecording} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '16px', padding: '0.3rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Done</button>
                </div>
              </div>
            ) : audioUrlPreview ? (
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', borderRadius: '24px', padding: '0.4rem 0.75rem', boxSizing: 'border-box', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={togglePreviewAudio}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  {isPreviewPlaying ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  )}
                </button>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '3px', height: '24px', overflow: 'hidden' }}>
                  {[4, 12, 18, 8, 15, 22, 10, 18, 12, 6].map((h, i) => (
                    <div key={i} style={{ width: '3px', height: isPreviewPlaying ? `${Math.max(6, (h * (1 + Math.sin(i + Date.now() / 200))))}px` : `${h}px`, backgroundColor: '#94a3b8', borderRadius: '2px', flexShrink: 0 }} />
                  ))}
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', minWidth: '32px', textAlign: 'right', flexShrink: 0 }}>
                  {recordingTime ? `${Math.floor(recordingTime / 60)}:{('0' + (recordingTime % 60)).slice(-2)}` : '0:00'}
                </span>
                <button type="button" onClick={cancelRecording} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, flexShrink: 0, marginLeft: '0.25rem' }}>Discard</button>
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: 0, display: 'flex', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '20px', padding: '0.65rem 1rem', boxSizing: 'border-box', alignItems: 'center' }}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Type a message or attach media..."
                  value={newMessage}
                  onChange={handleInputResize}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                  style={{ width: '100%', resize: 'none', maxHeight: '120px', border: 'none', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit', background: 'transparent', lineHeight: 1.4, margin: 0, padding: 0 }}
                />
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept="image/*,video/*" 
              style={{ display: 'none' }} 
            />

            {!isRecording && !audioUrlPreview && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image or video"
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </button>

                <button
                  type="button"
                  onClick={startRecording}
                  title="Record voice note"
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v1a7 7 0 0 1-14 0v-1"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
                </button>
              </>
            )}

            <button 
              type="submit" 
              disabled={(!audioBlob && !mediaFile && newMessage.trim().length < MIN_MESSAGE_LENGTH)}
              style={{ background: (!audioBlob && !mediaFile && newMessage.trim().length < MIN_MESSAGE_LENGTH) ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!audioBlob && !mediaFile && newMessage.trim().length < MIN_MESSAGE_LENGTH) ? 'default' : 'pointer', flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', height: '72vh', overflowY: 'auto' }}>
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
