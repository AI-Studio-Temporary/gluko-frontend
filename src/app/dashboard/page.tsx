'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Activity, LogOut, Droplets, TrendingUp, Utensils, Clock, MessageSquare } from 'lucide-react'
import Link from 'next/link'

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${color} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">
        {value}
        <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Topbar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
              <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-slate-900 text-lg">Gluko</span>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
            )}
            <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            Good morning{user?.email ? `, ${user.email.split('@')[0]}` : ''} 👋
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Here&apos;s your health overview for today.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Droplets}
            label="Blood glucose"
            value="5.6"
            unit="mmol/L"
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            icon={TrendingUp}
            label="HbA1c (est.)"
            value="6.1"
            unit="%"
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            icon={Utensils}
            label="Carbs today"
            value="142"
            unit="g"
            color="bg-orange-50 text-orange-600"
          />
          <StatCard
            icon={Clock}
            label="Time in range"
            value="87"
            unit="%"
            color="bg-violet-50 text-violet-600"
          />
        </div>

        {/* AI Tutor card */}
        <Link href="/tutor" className="block group">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center hover:border-blue-200 hover:shadow-md transition-all">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
              <MessageSquare className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">AI Tutor</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Chat with Gluko — your AI diabetes management assistant. Ask questions about nutrition, blood sugar, and more.
            </p>
          </div>
        </Link>
      </main>
    </div>
  )
}
