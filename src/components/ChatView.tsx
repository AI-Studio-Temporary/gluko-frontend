'use client'

import { useAuth } from '@/contexts/AuthContext'
import { chatApi, type ChatMessage } from '@/lib/api'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import {
  Activity, Send, BookOpen, Utensils, ClipboardList,
  Calculator, Shield, Bot, Loader2,
  Paperclip, Mic, Square, X,
} from 'lucide-react'

// ── Agent display config ────────────────────────────────────

const AGENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  tutor:            { label: 'Tutor',            icon: BookOpen,      color: 'bg-blue-100 text-blue-700' },
  carb_estimator:   { label: 'Carb Estimator',   icon: Utensils,      color: 'bg-orange-100 text-orange-700' },
  log_agent:        { label: 'Log Agent',         icon: ClipboardList, color: 'bg-emerald-100 text-emerald-700' },
  bolus_calculator: { label: 'Bolus Calculator',  icon: Calculator,    color: 'bg-violet-100 text-violet-700' },
  summary:          { label: 'Summary',           icon: ClipboardList, color: 'bg-cyan-100 text-cyan-700' },
  safety_gate:      { label: 'Safety Alert',      icon: Shield,        color: 'bg-red-100 text-red-700' },
  orchestrator:     { label: 'Gluko',             icon: Bot,           color: 'bg-slate-100 text-slate-700' },
}

function AgentBadge({ agentUsed }: { agentUsed?: string }) {
  if (!agentUsed) return null
  const config = AGENT_CONFIG[agentUsed] || { label: agentUsed, icon: Bot, color: 'bg-slate-100 text-slate-600' }
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  )
}

function TypingIndicator({ agentLabel }: { agentLabel?: string }) {
  return (
    <div className="flex items-start gap-3 max-w-[80%]">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Activity className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
      </div>
      <div>
        {agentLabel && (
          <p className="text-[10px] text-slate-400 mb-1 ml-1">
            Using <span className="font-medium text-slate-500">{agentLabel}</span>...
          </p>
        )}
        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <div className="flex gap-1.5">
            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''} max-w-[80%] ${isUser ? 'ml-auto' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Activity className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
      )}
      <div className="space-y-1 min-w-0">
        {!isUser && message.agent_used && <AgentBadge agentUsed={message.agent_used} />}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm whitespace-pre-wrap'
            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
        }`}>
          {isUser ? message.content : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-0.5">{children}</li>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  )
}

function guessAgent(text: string): string {
  const t = text.toLowerCase()
  if (/\b(ate|eat|had|lunch|dinner|breakfast|snack|sandwich|pizza|rice|chicken)\b/.test(t)) return 'Carb Estimator'
  if (/\b(glucose|bg|blood sugar|sugar)\s*(is|was|at|:)?\s*\d/.test(t)) return 'Log Agent'
  if (/\b(took|injected|insulin|units?|novorapid|humalog|lantus)\b/.test(t)) return 'Log Agent'
  if (/\b(ran|run|walk|swim|cycl|exercise|gym|yoga|sport)\b/.test(t)) return 'Log Agent'
  if (/\b(bolus|dose|how much insulin|calculate)\b/.test(t)) return 'Bolus Calculator'
  if (/\b(summary|show my day|today|overview)\b/.test(t)) return 'Summary'
  return 'Tutor'
}

// ── Chat View ───────────────────────────────────────────────

export default function ChatView({ sessionId }: { sessionId?: number }) {
  const { accessToken } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [thinkingAgent, setThinkingAgent] = useState<string | undefined>()
  const [currentSessionId, setCurrentSessionId] = useState<number | undefined>(sessionId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Image + audio upload state
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [pendingAudio, setPendingAudio] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isSending, scrollToBottom])

  // Load messages for existing session
  useEffect(() => {
    if (!accessToken || !sessionId) return
    setIsLoading(true)
    setCurrentSessionId(sessionId)
    chatApi.getMessages(accessToken, sessionId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [accessToken, sessionId])

  // Reset for new chat
  useEffect(() => {
    if (!sessionId) {
      setMessages([])
      setCurrentSessionId(undefined)
    }
  }, [sessionId])

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { alert('Image too large (max 5MB)'); return }
    setPendingImage(f)
    setImagePreview(URL.createObjectURL(f))
  }

  const clearImage = () => {
    setPendingImage(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      const chunks: BlobPart[] = []
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setPendingAudio(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorderRef.current = rec
      rec.start()
      setRecording(true)
      setRecordSeconds(0)
      recordTimerRef.current = window.setInterval(
        () => setRecordSeconds(s => s + 1), 1000,
      )
    } catch {
      alert('Microphone permission denied or not available.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current)
      recordTimerRef.current = null
    }
  }

  const clearAudio = () => {
    setPendingAudio(null)
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
  }

  const sendMessage = async () => {
    if (isSending || !accessToken) return
    const text = input.trim()
    const hasMedia = pendingImage || pendingAudio
    if (!text && !hasMedia) return

    // Create session if needed
    let sid = currentSessionId
    let isNewSession = false
    if (!sid) {
      const session = await chatApi.createSession(accessToken)
      sid = session.id
      setCurrentSessionId(sid)
      isNewSession = true
    }

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: pendingImage
        ? `📷 [photo] ${text}`.trim()
        : pendingAudio
          ? '🎤 [voice note]'
          : text,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsSending(true)
    setThinkingAgent(
      pendingImage ? 'Carb Estimator (vision)' :
      pendingAudio ? 'Carb Estimator (voice)' :
      guessAgent(text),
    )

    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      let reply: ChatMessage
      if (pendingImage) {
        reply = await chatApi.uploadMedia(accessToken, sid, 'image', pendingImage, pendingImage.name, text)
        clearImage()
      } else if (pendingAudio) {
        reply = await chatApi.uploadMedia(accessToken, sid, 'audio', pendingAudio, 'voice.webm')
        clearAudio()
      } else {
        reply = await chatApi.sendMessage(accessToken, sid, text)
      }
      setMessages(prev => [...prev, reply])
    } catch {
      setMessages(prev => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: 'Sorry, something went wrong. Please try again.', created_at: new Date().toISOString() },
      ])
    } finally {
      setIsSending(false)
      setThinkingAgent(undefined)
      inputRef.current?.focus()
    }

    // Navigate AFTER the message exchange so the component doesn't remount mid-flight
    if (isNewSession) {
      router.replace(`/chat/${sid}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  if (!accessToken) return null

  return (
    <>
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!sessionId && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Activity className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Gluko Chat</h2>
            <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
              Your AI diabetes assistant. Log meals, glucose, insulin — or ask questions.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {[
                'I just had a chicken sandwich',
                'My glucose is 145',
                'Took 4 units of Novorapid',
                'How much insulin for 60g carbs?',
                'Show my day',
                'What causes post-meal spikes?',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus() }}
                  className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-white hover:border-slate-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
            {isLoading && <p className="text-xs text-slate-400 text-center py-4">Loading messages...</p>}
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {isSending && <TypingIndicator agentLabel={thinkingAgent} />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 bg-white/80 backdrop-blur-sm p-3 flex-shrink-0">
        <div className="max-w-2xl mx-auto">

          {/* Preview row */}
          {(imagePreview || audioUrl || recording) && (
            <div className="mb-2 flex items-center gap-3">
              {imagePreview && (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="meal" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                  <button
                    onClick={clearImage}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {audioUrl && (
                <div className="flex items-center gap-2">
                  <audio src={audioUrl} controls className="h-9" />
                  <button
                    onClick={clearAudio}
                    className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {recording && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-mono">
                    {String(Math.floor(recordSeconds / 60)).padStart(2, '0')}:
                    {String(recordSeconds % 60).padStart(2, '0')}
                  </span>
                  <button
                    onClick={stopRecording}
                    className="ml-1 px-2 py-1 rounded-md bg-red-500 text-white text-xs flex items-center gap-1"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Buttons + textarea */}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={onPickImage}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending || recording}
              className="w-10 h-10 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 flex-shrink-0"
              title="Attach meal photo"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={isSending || !!pendingImage}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 disabled:opacity-40 ${
                recording
                  ? 'border-red-300 bg-red-50 text-red-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={recording ? 'Stop recording' : 'Record voice note'}
            >
              {recording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={pendingImage ? 'Optional hint about the meal…' : 'Log a meal, report glucose, or ask a question…'}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={isSending || (!input.trim() && !pendingImage && !pendingAudio)}
              className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors flex-shrink-0"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-2">
            Gluko provides general information only — not medical advice.
          </p>
        </div>
      </div>
    </>
  )
}
