'use client'

import { useAuth } from '@/contexts/AuthContext'
import { chatApi, type ChatMessage, type ChatSession } from '@/lib/api'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Activity, ArrowLeft, Send, Plus, MessageSquare,
  Droplets, Syringe, Utensils, Dumbbell, Calculator,
  BookOpen, Shield, ClipboardList, Bot,
} from 'lucide-react'
import Link from 'next/link'

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
        {!isUser && message.agent_used && (
          <AgentBadge agentUsed={message.agent_used} />
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'
          }`}
        >
          {message.content}
        </div>
      </div>
    </div>
  )
}

export default function TutorPage() {
  const { accessToken } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [thinkingAgent, setThinkingAgent] = useState<string | undefined>(undefined)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, isSending, scrollToBottom])

  // Load sessions on mount
  useEffect(() => {
    if (!accessToken) return
    chatApi.getSessions(accessToken).then(setSessions).catch(() => {})
  }, [accessToken])

  // Load messages when session changes
  useEffect(() => {
    if (!accessToken || !activeSession) return
    setIsLoading(true)
    chatApi
      .getMessages(accessToken, activeSession.id)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [accessToken, activeSession])

  const createSession = async () => {
    if (!accessToken) return
    const session = await chatApi.createSession(accessToken)
    setSessions(prev => [session, ...prev])
    setActiveSession(session)
    setMessages([])
    setSidebarOpen(false)
  }

  const selectSession = (session: ChatSession) => {
    setActiveSession(session)
    setMessages([])
    setSidebarOpen(false)
  }

  // Guess which agent will handle the message (for thinking indicator)
  const guessAgent = (text: string): string => {
    const t = text.toLowerCase()
    if (/\b(ate|eat|had|lunch|dinner|breakfast|snack|sandwich|pizza|rice|chicken)\b/.test(t)) return 'Carb Estimator'
    if (/\b(glucose|bg|blood sugar|sugar)\s*(is|was|at|:)?\s*\d/.test(t)) return 'Log Agent'
    if (/\b(took|injected|insulin|units?|novorapid|humalog|lantus)\b/.test(t)) return 'Log Agent'
    if (/\b(ran|run|walk|swim|cycl|exercise|gym|yoga|sport)\b/.test(t)) return 'Log Agent'
    if (/\b(bolus|dose|how much insulin|calculate)\b/.test(t)) return 'Bolus Calculator'
    if (/\b(summary|show my day|today|overview)\b/.test(t)) return 'Summary'
    return 'Tutor'
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !accessToken || isSending) return

    // Create a session if none is active
    let session = activeSession
    if (!session) {
      session = await chatApi.createSession(accessToken)
      setSessions(prev => [session!, ...prev])
      setActiveSession(session)
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

    // Reset textarea height
    if (inputRef.current) inputRef.current.style.height = 'auto'

    try {
      const reply = await chatApi.sendMessage(accessToken, session.id, text)
      setMessages(prev => [...prev, reply])
      // Update session title in sidebar
      setSessions(prev =>
        prev.map(s => (s.id === session!.id ? { ...s, title: s.title || text.slice(0, 40) } : s))
      )
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
    // Auto-resize textarea
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900">Gluko Chat</span>
          </div>
          <button
            onClick={createSession}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-8">No conversations yet</p>
          )}
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => selectSession(session)}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors mb-0.5 flex items-center gap-2.5 ${
                activeSession?.id === session.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
              <span className="truncate">{session.title || 'New chat'}</span>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <MessageSquare className="w-4 h-4 text-slate-600" />
          </button>
          <h1 className="text-sm font-semibold text-slate-700">
            {activeSession?.title || 'Gluko Chat'}
          </h1>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {!activeSession && messages.length === 0 ? (
            // Empty state
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                <Activity className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Gluko Chat</h2>
              <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
                Your AI diabetes assistant. Log meals, glucose, insulin — or ask questions about diabetes management.
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
              {isLoading && (
                <p className="text-xs text-slate-400 text-center py-4">Loading messages...</p>
              )}
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isSending && <TypingIndicator agentLabel={thinkingAgent} />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
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
      </div>
    </div>
  )
}
