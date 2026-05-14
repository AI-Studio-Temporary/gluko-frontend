'use client'

import { useAuth } from '@/contexts/AuthContext'
import { dashboardApi, type TrendsData } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Activity, ArrowLeft, Droplets, Syringe, Utensils, Dumbbell, Target, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
} from 'recharts'

// ── Helpers ─────────────────────────────────────────────────

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number | null
  unit: string
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${color} mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      {value != null ? (
        <p className="text-xl font-bold text-slate-900 mt-0.5">
          {value}<span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>
        </p>
      ) : (
        <p className="text-sm text-slate-300 mt-0.5">--</p>
      )}
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────

export default function TrendsPage() {
  const { accessToken } = useAuth()
  const [data, setData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)

  const load = useCallback(() => {
    if (!accessToken) return
    setLoading(true)
    dashboardApi.getTrends(accessToken, period)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [accessToken, period])

  useEffect(() => { load() }, [load])

  if (!accessToken) return null

  const chartData = data?.daily.map(d => ({
    ...d,
    label: formatDateShort(d.date),
  })) || []

  const s = data?.summary

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Trends</h1>
        {/* Period selector */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                onClick={() => setPeriod(d)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  period === d
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
      </div>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon={Droplets} label="Avg glucose" value={s?.glucose_avg ?? null} unit="mg/dL" color="bg-blue-50 text-blue-600" />
              <SummaryCard icon={Target} label="In range" value={s?.glucose_in_range_pct ?? null} unit="%" color="bg-emerald-50 text-emerald-600" />
              <SummaryCard icon={Syringe} label="Avg insulin/day" value={s?.insulin_avg_daily ?? null} unit="u" color="bg-violet-50 text-violet-600" />
              <SummaryCard icon={Utensils} label="Avg carbs/day" value={s?.carbs_avg_daily ?? null} unit="g" color="bg-orange-50 text-orange-600" />
            </div>

            {/* Glucose chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Blood Glucose</h3>
              {chartData.some(d => d.glucose_avg) ? (
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[50, 'auto']} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: any, name: any) => {
                        const labels: Record<string, string> = { glucose_avg: 'Avg', glucose_min: 'Min', glucose_max: 'Max' }
                        return [value ? `${value} mg/dL` : '--', labels[name] || name]
                      }}
                    />
                    <Area dataKey="glucose_max" fill="#dbeafe" stroke="none" fillOpacity={0.5} />
                    <Area dataKey="glucose_min" fill="#ffffff" stroke="none" fillOpacity={1} />
                    <Line dataKey="glucose_avg" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: '#2563eb' }} connectNulls />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-300 text-center py-10">No glucose data for this period</p>
              )}
            </div>

            {/* Insulin chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Daily Insulin</h3>
              {chartData.some(d => d.insulin_total > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: any) => [`${value} units`, 'Insulin']}
                    />
                    <Bar dataKey="insulin_total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-300 text-center py-10">No insulin data for this period</p>
              )}
            </div>

            {/* Carbs chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Daily Carbs</h3>
              {chartData.some(d => d.carbs_total > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: any) => [`${value}g`, 'Carbs']}
                    />
                    <Bar dataKey="carbs_total" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-300 text-center py-10">No meal data for this period</p>
              )}
            </div>

            {/* Activity summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Activity</h3>
              {chartData.some(d => d.sport_minutes > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                      formatter={(value: any) => [`${value} min`, 'Activity']}
                    />
                    <Bar dataKey="sport_minutes" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-300 text-center py-10">No activity data for this period</p>
              )}
            </div>
          </>
        )}
    </div>
  )
}
