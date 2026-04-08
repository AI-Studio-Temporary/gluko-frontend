'use client'

import { useAuth } from '@/contexts/AuthContext'
import { chatApi, type ChatSession } from '@/lib/api'
import { useState, useEffect } from 'react'
import {
  Activity,
  BarChart3,
  Calculator,
  ClipboardList,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Trash2,
  TrendingUp,
  UserCircle,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/logbook', label: 'Logbook', icon: ClipboardList },
  { href: '/bolus-calculator', label: 'Bolus Calc', icon: Calculator },
  { href: '/trends', label: 'Trends', icon: TrendingUp },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { accessToken, user, logout, isLoading } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isChat = pathname === '/' || pathname.startsWith('/chat/')
  const activeChatId = pathname.startsWith('/chat/') ? Number(pathname.split('/')[2]) : null

  useEffect(() => {
    if (!accessToken) return
    chatApi.getSessions(accessToken).then(setSessions).catch(() => {})
  }, [accessToken])

  const createSession = async () => {
    if (!accessToken) return
    const session = await chatApi.createSession(accessToken)
    setSessions(prev => [session, ...prev])
    router.push(`/chat/${session.id}`)
    setSidebarOpen(false)
  }

  const refreshSessions = () => {
    if (!accessToken) return
    chatApi.getSessions(accessToken).then(setSessions).catch(() => {})
  }

  const deleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (!accessToken) return
    await chatApi.deleteSession(accessToken, sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (activeChatId === sessionId) router.push('/')
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white animate-pulse" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-slate-900 text-lg">Gluko</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 text-lg">Gluko</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Chat sessions — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1">Chats</p>
              <button
                onClick={createSession}
                className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors"
                title="New chat"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            {/* New chat link */}
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5 ${
                pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
              <span className="truncate">New chat</span>
            </Link>

            {sessions.map(session => (
              <Link
                key={session.id}
                href={`/chat/${session.id}`}
                onClick={() => setSidebarOpen(false)}
                className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5 ${
                  activeChatId === session.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
                <span className="truncate flex-1">{session.title || 'Untitled'}</span>
                <button
                  onClick={(e) => deleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-md hover:bg-red-50 flex items-center justify-center transition-opacity flex-shrink-0"
                  title="Delete chat"
                >
                  <Trash2 className="w-3 h-3 text-slate-400 hover:text-red-500" />
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation — pinned, never scrolls */}
        <div className="px-3 py-2 border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">Tools</p>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors mb-0.5 ${
                pathname === item.href ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <item.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
              {item.label}
            </Link>
          ))}
        </div>

        {/* Bottom section */}
        <div className="p-3 border-t border-slate-100 space-y-0.5">
          <Link
            href="/profile"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
              pathname === '/profile' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span className="truncate">{user?.email || 'Profile'}</span>
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header (only on non-chat pages, chat has its own) */}
        {!isChat && (
          <header className="h-14 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
            >
              <Menu className="w-4 h-4 text-slate-600" />
            </button>
            <h1 className="text-sm font-semibold text-slate-700">
              {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Gluko'}
            </h1>
          </header>
        )}

        {/* Chat pages get the hamburger injected differently */}
        {isChat && (
          <header className="h-14 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex items-center px-4 gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"
            >
              <Menu className="w-4 h-4 text-slate-600" />
            </button>
            <h1 className="text-sm font-semibold text-slate-700">Gluko Chat</h1>
          </header>
        )}

        <div className={`flex-1 ${isChat ? 'flex flex-col' : 'overflow-y-auto'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}
