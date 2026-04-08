'use client'

import { useAuth } from '@/contexts/AuthContext'
import { dashboardApi, type DashboardSummary } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Activity,
  LogOut,
  Droplets,
  Syringe,
  Utensils,
  Dumbbell,
  MessageSquare,
  UserCircle,
  ClipboardList,
  Calculator,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

// ── Helpers ─────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  empty,
}: {
  icon: React.ElementType
  label: string
  value: string | number | null
  unit: string
  color: string
  empty?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${color} mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      {value != null ? (
        <p className="text-2xl font-bold text-slate-900 mt-1">
          {value}
          <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
        </p>
      ) : (
        <p className="text-sm text-slate-300 mt-1">{empty || 'No data'}</p>
      )}
    </div>
  )
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

// ── Page ────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, accessToken, logout } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!accessToken) return
    dashboardApi.getSummary(accessToken)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accessToken])

  const hasAnyData = summary && (
    summary.glucose.count > 0 || summary.insulin.count > 0 ||
    summary.meals.count > 0 || summary.sport.count > 0
  )

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
            <Link href="/profile">
              <Button variant="outline" size="sm" className="gap-1.5">
                <UserCircle className="w-3.5 h-3.5" />
                Profile
              </Button>
            </Link>
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
            {getGreeting()}{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Here&apos;s your health overview for today.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Droplets}
                label="Latest glucose"
                value={summary?.glucose.latest?.value_mgdl ?? null}
                unit="mg/dL"
                color="bg-blue-50 text-blue-600"
                empty="No readings"
              />
              <StatCard
                icon={Syringe}
                label="Insulin today"
                value={summary?.insulin.total_units ? Math.round(summary.insulin.total_units * 10) / 10 : null}
                unit="units"
                color="bg-violet-50 text-violet-600"
                empty="No doses"
              />
              <StatCard
                icon={Utensils}
                label="Carbs today"
                value={summary?.meals.total_carbs ? Math.round(summary.meals.total_carbs) : null}
                unit="g"
                color="bg-orange-50 text-orange-600"
                empty="No meals"
              />
              <StatCard
                icon={Dumbbell}
                label="Activity"
                value={summary?.sport.total_minutes || null}
                unit="min"
                color="bg-emerald-50 text-emerald-600"
                empty="No activity"
              />
            </div>

            {/* Glucose detail row */}
            {summary && summary.glucose.count > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-8">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Glucose today</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-slate-400">Readings</p>
                    <p className="text-lg font-bold text-slate-900">{summary.glucose.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Average</p>
                    <p className="text-lg font-bold text-slate-900">{summary.glucose.avg} <span className="text-xs font-normal text-slate-400">mg/dL</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Low</p>
                    <p className="text-lg font-bold text-blue-600">{summary.glucose.min}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">High</p>
                    <p className="text-lg font-bold text-orange-600">{summary.glucose.max}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Activity */}
            {hasAnyData && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-8 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-50">
                  <h3 className="text-sm font-semibold text-slate-900">Today&apos;s activity</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {summary!.meals.entries.map(e => (
                    <div key={`meal-${e.id}`} className="px-5 py-3 flex items-center gap-3">
                      <Utensils className="w-4 h-4 text-orange-400 shrink-0" />
                      <span className="text-xs text-slate-400 w-12 shrink-0">{formatTime(e.logged_at)}</span>
                      <span className="text-sm text-slate-700 truncate">{e.description}</span>
                      {e.estimated_carbs && <span className="text-xs text-orange-600 ml-auto shrink-0">{e.estimated_carbs}g</span>}
                    </div>
                  ))}
                  {summary!.insulin.entries.map(e => (
                    <div key={`ins-${e.id}`} className="px-5 py-3 flex items-center gap-3">
                      <Syringe className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="text-xs text-slate-400 w-12 shrink-0">{formatTime(e.logged_at)}</span>
                      <span className="text-sm text-slate-700">{e.units}u {e.insulin_type}</span>
                    </div>
                  ))}
                  {summary!.sport.entries.map(e => (
                    <div key={`sport-${e.id}`} className="px-5 py-3 flex items-center gap-3">
                      <Dumbbell className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-400 w-12 shrink-0">{formatTime(e.logged_at)}</span>
                      <span className="text-sm text-slate-700">{e.activity_type} — {e.duration_min} min</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!hasAnyData && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center mb-8">
                <p className="text-slate-400 text-sm">No logs today. Start by logging your glucose.</p>
                <Link href="/logbook">
                  <Button size="sm" className="mt-4 gap-1.5">
                    <ClipboardList className="w-4 h-4" />
                    Open Logbook
                  </Button>
                </Link>
              </div>
            )}

            {/* Action cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <NavCard href="/logbook" icon={ClipboardList} label="Logbook" color="bg-blue-50 text-blue-600 group-hover:bg-blue-100" />
              <NavCard href="/bolus-calculator" icon={Calculator} label="Bolus Calc" color="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100" />
              <NavCard href="/tutor" icon={MessageSquare} label="AI Tutor" color="bg-violet-50 text-violet-600 group-hover:bg-violet-100" />
              <NavCard href="/profile" icon={UserCircle} label="Profile" color="bg-orange-50 text-orange-600 group-hover:bg-orange-100" />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function NavCard({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string
  icon: React.ElementType
  label: string
  color: string
}) {
  return (
    <Link href={href} className="block group">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-center hover:shadow-md transition-all">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${color} transition-colors mb-3`}>
          <Icon className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
      </div>
    </Link>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
