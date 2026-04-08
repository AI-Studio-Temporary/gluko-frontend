'use client'

import { useAuth } from '@/contexts/AuthContext'
import {
  bolusApi,
  profileApi,
  type BolusResult,
  type BolusCalculation,
  type UserProfile,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Activity,
  ArrowLeft,
  Calculator,
  ChevronDown,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-AU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export default function BolusCalculatorPage() {
  const { accessToken } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [carbs, setCarbs] = useState('')
  const [glucose, setGlucose] = useState('')
  const [result, setResult] = useState<BolusResult | null>(null)
  const [history, setHistory] = useState<BolusCalculation[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [error, setError] = useState('')
  const [showProfile, setShowProfile] = useState(false)

  const loadHistory = useCallback(() => {
    if (!accessToken) return
    bolusApi.getHistory(accessToken).then(setHistory).catch(() => {})
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) return
    profileApi.get(accessToken)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoadingProfile(false))
    loadHistory()
  }, [accessToken, loadHistory])

  const profileReady = profile?.insulin_to_carb_ratio && profile?.insulin_sensitivity_factor

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken || !carbs || !glucose) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await bolusApi.calculate(accessToken, carbs, glucose)
      setResult(res)
      loadHistory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
    } finally {
      setLoading(false)
    }
  }

  if (!accessToken) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Topbar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
                <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-slate-900 text-lg">Bolus Calculator</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Profile check */}
        {!loadingProfile && !profileReady && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Profile settings required</p>
              <p className="text-sm text-amber-700 mt-1">
                Please set your insulin-to-carb ratio (ICR) and insulin sensitivity factor (ISF) in your profile before using the bolus calculator.
              </p>
              <Link href="/profile" className="inline-block mt-3">
                <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                  Go to Profile
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Calculator form */}
        <form onSubmit={handleCalculate} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
              <Calculator className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="font-semibold text-slate-900">Calculate dose</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Carbohydrates (g)</Label>
              <Input
                type="number" min={0} max={500} step={1}
                value={carbs} onChange={e => setCarbs(e.target.value)}
                placeholder="e.g. 60"
                required
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-slate-600 mb-1 block">Current glucose (mmol/L)</Label>
              <Input
                type="number" min={1} max={35} step={0.1}
                value={glucose} onChange={e => setGlucose(e.target.value)}
                placeholder="e.g. 8.5"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <Button type="submit" disabled={loading || !profileReady} className="gap-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
            Calculate
          </Button>
        </form>

        {/* Result */}
        {result && (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
            {/* Total dose highlight */}
            <div className="bg-blue-600 px-6 py-5 text-center">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide">Suggested total dose</p>
              <p className="text-4xl font-bold text-white mt-1">
                {result.total_dose}
                <span className="text-lg font-normal text-blue-200 ml-1">units</span>
              </p>
            </div>

            {/* Formula breakdown */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Meal dose</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{result.meal_dose} <span className="text-sm font-normal text-slate-400">units</span></p>
                  <p className="text-xs text-slate-400 mt-1">{result.formula.meal}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Correction dose</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{result.correction_dose} <span className="text-sm font-normal text-slate-400">units</span></p>
                  <p className="text-xs text-slate-400 mt-1">{result.formula.correction}</p>
                </div>
              </div>

              {/* Profile settings used */}
              <button
                onClick={() => setShowProfile(!showProfile)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                Profile settings used
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showProfile ? 'rotate-180' : ''}`} />
              </button>
              {showProfile && profile && (
                <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-xs text-slate-400">ICR</p>
                    <p className="text-sm font-semibold text-slate-700">1:{profile.insulin_to_carb_ratio}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">ISF</p>
                    <p className="text-sm font-semibold text-slate-700">{profile.insulin_sensitivity_factor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Target</p>
                    <p className="text-sm font-semibold text-slate-700">{profile.target_bg_min} mmol/L</p>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-800 leading-relaxed">{result.disclaimer}</p>
              </div>
            </div>
          </div>
        )}

        {/* Recent calculations */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="px-5 py-4 border-b border-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">Recent calculations</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {history.slice(0, 5).map(calc => (
                <div key={calc.id} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-400 w-28 shrink-0">{formatTime(calc.calculated_at)}</span>
                    <span className="text-sm text-slate-600">{calc.carbohydrates_g}g carbs</span>
                    <span className="text-xs text-slate-400">BG {calc.current_glucose}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{calc.total_dose}u</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
