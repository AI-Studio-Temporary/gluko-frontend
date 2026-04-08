'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  logsApi,
  type GlucoseLog,
  type InsulinLog,
  type MealLog,
  type SportLog,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Activity,
  ArrowLeft,
  Droplets,
  Syringe,
  Utensils,
  Dumbbell,
  Plus,
  Trash2,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

// ── Types ───────────────────────────────────────────────────

type Tab = 'glucose' | 'insulin' | 'meals' | 'sport'

const TABS: { key: Tab; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'glucose', label: 'Glucose', icon: Droplets, color: 'blue' },
  { key: 'insulin', label: 'Insulin', icon: Syringe, color: 'violet' },
  { key: 'meals', label: 'Meals', icon: Utensils, color: 'orange' },
  { key: 'sport', label: 'Sport', icon: Dumbbell, color: 'emerald' },
]

const COLORS: Record<string, { bg: string; text: string; activeBg: string; activeText: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', activeBg: 'bg-blue-600', activeText: 'text-white' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', activeBg: 'bg-violet-600', activeText: 'text-white' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-600', activeBg: 'bg-orange-600', activeText: 'text-white' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', activeBg: 'bg-emerald-600', activeText: 'text-white' },
}

// ── Helpers ─────────────────────────────────────────────────

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-colors"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Glucose Form & List ─────────────────────────────────────

function GlucoseTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<GlucoseLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState('')
  const [context, setContext] = useState('other')

  const load = useCallback(() => {
    logsApi.getGlucose(token).then(setLogs).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value) return
    setSaving(true)
    try {
      await logsApi.createGlucose(token, { value_mgdl: Number(value), measurement_context: context })
      setValue('')
      setContext('other')
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    await logsApi.deleteGlucose(token, id)
    load()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Log blood glucose</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Value (mg/dL)</Label>
            <Input type="number" min={20} max={600} value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. 120" required />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Context</Label>
            <Select value={context} onChange={setContext} options={[
              { value: 'fasting', label: 'Fasting' },
              { value: 'before_meal', label: 'Before meal' },
              { value: 'after_meal', label: 'After meal' },
              { value: 'bedtime', label: 'Bedtime' },
              { value: 'other', label: 'Other' },
            ]} />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Log
            </Button>
          </div>
        </div>
      </form>
      <LogList loading={loading} empty="No glucose readings yet.">
        {logs.slice(0, 10).map(log => (
          <LogEntry key={log.id} onDelete={() => handleDelete(log.id)} time={log.logged_at}>
            <span className="text-lg font-bold text-slate-900">{log.value_mgdl}</span>
            <span className="text-sm text-slate-400 ml-1">mg/dL</span>
            <span className="ml-3 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {log.measurement_context.replace('_', ' ')}
            </span>
          </LogEntry>
        ))}
      </LogList>
    </div>
  )
}

// ── Insulin Form & List ─────────────────────────────────────

function InsulinTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<InsulinLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [units, setUnits] = useState('')
  const [type, setType] = useState('bolus')
  const [brand, setBrand] = useState('')

  const load = useCallback(() => {
    logsApi.getInsulin(token).then(setLogs).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!units) return
    setSaving(true)
    try {
      await logsApi.createInsulin(token, { units, insulin_type: type, insulin_brand: brand })
      setUnits('')
      setBrand('')
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    await logsApi.deleteInsulin(token, id)
    load()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Log insulin dose</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Units</Label>
            <Input type="number" min={0.5} max={100} step={0.5} value={units} onChange={e => setUnits(e.target.value)} placeholder="e.g. 4.5" required />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Type</Label>
            <Select value={type} onChange={setType} options={[
              { value: 'bolus', label: 'Bolus' },
              { value: 'basal', label: 'Basal' },
              { value: 'correction', label: 'Correction' },
            ]} />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Brand (optional)</Label>
            <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Novorapid" />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full gap-1.5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Log
            </Button>
          </div>
        </div>
      </form>
      <LogList loading={loading} empty="No insulin doses logged yet.">
        {logs.slice(0, 10).map(log => (
          <LogEntry key={log.id} onDelete={() => handleDelete(log.id)} time={log.logged_at}>
            <span className="text-lg font-bold text-slate-900">{log.units}</span>
            <span className="text-sm text-slate-400 ml-1">units</span>
            <span className="ml-3 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{log.insulin_type}</span>
            {log.insulin_brand && <span className="ml-2 text-xs text-slate-400">{log.insulin_brand}</span>}
          </LogEntry>
        ))}
      </LogList>
    </div>
  )
}

// ── Meal Form & List ────────────────────────────────────────

function MealTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState('')
  const [carbs, setCarbs] = useState('')
  const [mealType, setMealType] = useState('snack')

  const load = useCallback(() => {
    logsApi.getMeals(token).then(setLogs).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description) return
    setSaving(true)
    try {
      await logsApi.createMeal(token, {
        description,
        estimated_carbs: carbs || null,
        meal_type: mealType,
        carb_source: 'manual',
      })
      setDescription('')
      setCarbs('')
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    await logsApi.deleteMeal(token, id)
    load()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Log a meal</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div className="sm:col-span-2">
            <Label className="text-xs text-slate-500 mb-1 block">What did you eat?</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Chicken sandwich and an apple" required />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Estimated carbs (g, optional)</Label>
            <Input type="number" min={0} max={500} step={1} value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="e.g. 55" />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Meal type</Label>
            <Select value={mealType} onChange={setMealType} options={[
              { value: 'breakfast', label: 'Breakfast' },
              { value: 'lunch', label: 'Lunch' },
              { value: 'dinner', label: 'Dinner' },
              { value: 'snack', label: 'Snack' },
            ]} />
          </div>
        </div>
        <Button type="submit" disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Log meal
        </Button>
      </form>
      <LogList loading={loading} empty="No meals logged yet.">
        {logs.slice(0, 10).map(log => (
          <LogEntry key={log.id} onDelete={() => handleDelete(log.id)} time={log.logged_at}>
            <div>
              <span className="text-sm font-medium text-slate-900">{log.description}</span>
              <div className="flex items-center gap-2 mt-0.5">
                {log.estimated_carbs && (
                  <span className="text-xs text-orange-600 font-medium">{log.estimated_carbs}g carbs</span>
                )}
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{log.meal_type}</span>
              </div>
            </div>
          </LogEntry>
        ))}
      </LogList>
    </div>
  )
}

// ── Sport Form & List ───────────────────────────────────────

function SportTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<SportLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activity, setActivity] = useState('')
  const [duration, setDuration] = useState('')
  const [intensity, setIntensity] = useState('moderate')
  const [glucoseBefore, setGlucoseBefore] = useState('')
  const [glucoseAfter, setGlucoseAfter] = useState('')

  const load = useCallback(() => {
    logsApi.getSport(token).then(setLogs).finally(() => setLoading(false))
  }, [token])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activity || !duration) return
    setSaving(true)
    try {
      await logsApi.createSport(token, {
        activity_type: activity,
        duration_min: Number(duration),
        intensity,
        glucose_before: glucoseBefore ? Number(glucoseBefore) : null,
        glucose_after: glucoseAfter ? Number(glucoseAfter) : null,
      })
      setActivity('')
      setDuration('')
      setGlucoseBefore('')
      setGlucoseAfter('')
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    await logsApi.deleteSport(token, id)
    load()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Log activity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Activity</Label>
            <Input value={activity} onChange={e => setActivity(e.target.value)} placeholder="e.g. Running" required />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Duration (min)</Label>
            <Input type="number" min={1} max={600} value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 30" required />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Intensity</Label>
            <Select value={intensity} onChange={setIntensity} options={[
              { value: 'low', label: 'Low' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'high', label: 'High' },
            ]} />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Glucose before (optional)</Label>
            <Input type="number" min={20} max={600} value={glucoseBefore} onChange={e => setGlucoseBefore(e.target.value)} placeholder="mg/dL" />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">Glucose after (optional)</Label>
            <Input type="number" min={20} max={600} value={glucoseAfter} onChange={e => setGlucoseAfter(e.target.value)} placeholder="mg/dL" />
          </div>
        </div>
        <Button type="submit" disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Log activity
        </Button>
      </form>
      <LogList loading={loading} empty="No activities logged yet.">
        {logs.slice(0, 10).map(log => (
          <LogEntry key={log.id} onDelete={() => handleDelete(log.id)} time={log.logged_at}>
            <div>
              <span className="text-sm font-medium text-slate-900">{log.activity_type}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-emerald-600 font-medium">{log.duration_min} min</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{log.intensity}</span>
                {log.glucose_before != null && (
                  <span className="text-xs text-slate-400">BG: {log.glucose_before} → {log.glucose_after ?? '?'}</span>
                )}
              </div>
            </div>
          </LogEntry>
        ))}
      </LogList>
    </div>
  )
}

// ── Shared components ───────────────────────────────────────

function LogList({ loading, empty, children }: { loading: boolean; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : []

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
        <p className="text-sm text-slate-400">{empty}</p>
      </div>
    )
  }

  // Group by date
  const grouped: Record<string, React.ReactNode[]> = {}
  items.forEach((child) => {
    const props = (child as React.ReactElement<{ time: string }>)?.props
    const dateKey = props?.time ? formatDate(props.time) : 'Unknown'
    if (!grouped[dateKey]) grouped[dateKey] = []
    grouped[dateKey].push(child)
  })

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dateLabel, entries]) => (
        <div key={dateLabel}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 px-1">{dateLabel}</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {entries}
          </div>
        </div>
      ))}
    </div>
  )
}

function LogEntry({
  children,
  onDelete,
  time,
}: {
  children: React.ReactNode
  onDelete: () => void
  time: string
}) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete()
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 group">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xs text-slate-400 w-12 shrink-0">{formatTime(time)}</span>
        <div className="min-w-0">{children}</div>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────

export default function LogbookPage() {
  const { accessToken } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('glucose')

  if (!accessToken) return null

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Logbook</h1>
      {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => {
            const active = activeTab === tab.key
            const c = COLORS[tab.color]
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  active
                    ? `${c.activeBg} ${c.activeText} shadow-sm`
                    : `${c.bg} ${c.text} hover:shadow-sm`
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'glucose' && <GlucoseTab token={accessToken} />}
        {activeTab === 'insulin' && <InsulinTab token={accessToken} />}
        {activeTab === 'meals' && <MealTab token={accessToken} />}
        {activeTab === 'sport' && <SportTab token={accessToken} />}
    </div>
  )
}
