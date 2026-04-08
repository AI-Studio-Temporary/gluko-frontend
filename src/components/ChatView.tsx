'use client'

import { useAuth } from '@/contexts/AuthContext'
import { chatApi, type ChatMessage } from '@/lib/api'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, Send, BookOpen, Utensils, ClipboardList,
  Calculator, Shield, Bot, Loader2,
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
      <div className="space-y-1">
        {!isUser && message.agent_used && <AgentBadge agentUsed={message.agent_used} />}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
        }`}>
          {message.content}
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

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !accessToken || isSending) return

    // Create session if needed
    let sid = currentSessionId
    if (!sid) {
      const session = await chatApi.createSession(accessToken)
      sid = session.id
      setCurrentSessionId(sid)
      // Navigate to the session URL so sidebar updates
      router.push(`/chat/${sid}`)
    }

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsSending(true)
    setThinkingAgent(guessAgent(text))

    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const reply = await chatApi.sendMessage(accessToken, sid, text)
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
      <div className="flex-1 overflow-y-auto">
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
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Log a meal, report glucose, or ask a question..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-colors"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Gluko provides general information only — not medical advice.
        </p>
      </div>
    </>
  )
}
