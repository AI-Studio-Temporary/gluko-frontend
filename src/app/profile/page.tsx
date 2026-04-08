'use client'

import { useAuth } from '@/contexts/AuthContext'
import { profileApi, type UserProfile } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity, ArrowLeft, Save, User, Heart, Syringe, Target, Salad, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

// ── helpers ──────────────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
  )
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string
  hint?: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <Label className="text-xs font-medium text-slate-600 mb-1 block">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-colors"
    >
      <option value="">{placeholder || 'Select…'}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-colors resize-none"
    />
  )
}

// ── option lists ─────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const DIABETES_TYPE_OPTIONS = [
  { value: 'type1', label: 'Type 1' },
  { value: 'type2', label: 'Type 2' },
  { value: 'gestational', label: 'Gestational' },
  { value: 'lada', label: 'LADA (Type 1.5)' },
  { value: 'mody', label: 'MODY' },
  { value: 'prediabetes', label: 'Prediabetes' },
  { value: 'other', label: 'Other' },
]

const INSULIN_REGIMEN_OPTIONS = [
  { value: 'mdi', label: 'Multiple Daily Injections (MDI)' },
  { value: 'pump', label: 'Insulin Pump (CSII)' },
  { value: 'basal_only', label: 'Basal Only' },
  { value: 'premixed', label: 'Premixed Insulin' },
  { value: 'none', label: 'Not on Insulin' },
]

const MONITORING_OPTIONS = [
  { value: 'cgm', label: 'Continuous Glucose Monitor (CGM)' },
  { value: 'finger_prick', label: 'Finger Prick' },
  { value: 'both', label: 'Both CGM & Finger Prick' },
  { value: 'none', label: 'None currently' },
]

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary (little/no exercise)' },
  { value: 'light', label: 'Light (1–3 days/week)' },
  { value: 'moderate', label: 'Moderate (3–5 days/week)' },
  { value: 'active', label: 'Active (6–7 days/week)' },
  { value: 'very_active', label: 'Very Active (twice/day or physical job)' },
]

// ── empty profile ────────────────────────────────────────────────────────────

const EMPTY_PROFILE: UserProfile = {
  first_name: '',
  last_name: '',
  date_of_birth: null,
  gender: '',
  weight_kg: null,
  height_cm: null,
  diabetes_type: '',
  diagnosis_year: null,
  on_insulin: false,
  insulin_regimen: '',
  insulin_type: '',
  insulin_to_carb_ratio: null,
  insulin_sensitivity_factor: null,
  target_bg_min: null,
  target_bg_max: null,
  last_hba1c: null,
  monitoring_method: '',
  cgm_device: '',
  other_medications: '',
  other_conditions: '',
  dietary_restrictions: '',
  activity_level: '',
  management_goals: '',
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { accessToken, user } = useAuth()
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!accessToken) return
    profileApi
      .get(accessToken)
      .then(data => setProfile({ ...EMPTY_PROFILE, ...data }))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [accessToken])

  const set = (field: keyof UserProfile) => (value: string | boolean | null) =>
    setProfile(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    if (!accessToken) return
    setIsSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await profileApi.update(accessToken, profile)
      setProfile({ ...EMPTY_PROFILE, ...updated })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save profile.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
        <p className="text-sm text-slate-500">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Topbar */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
                <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-slate-900 text-lg">My Profile</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.email && (
              <span className="text-sm text-slate-500 hidden sm:block">{user.email}</span>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              {saved ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving…' : 'Save'}
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-slate-500">
          Your profile helps Gluko give you personalised, relevant advice every time you chat.
          All fields are optional — fill in what you feel comfortable sharing.
        </p>

        {/* Personal Details */}
        <Section icon={User} title="Personal Details">
          <Field label="First name">
            <Input
              value={profile.first_name}
              onChange={e => set('first_name')(e.target.value)}
              placeholder="e.g. Alex"
            />
          </Field>
          <Field label="Last name">
            <Input
              value={profile.last_name}
              onChange={e => set('last_name')(e.target.value)}
              placeholder="e.g. Smith"
            />
          </Field>
          <Field label="Date of birth">
            <Input
              type="date"
              value={profile.date_of_birth ?? ''}
              onChange={e => set('date_of_birth')(e.target.value || null)}
            />
          </Field>
          <Field label="Gender">
            <Select
              value={profile.gender}
              onChange={set('gender')}
              options={GENDER_OPTIONS}
            />
          </Field>
          <Field label="Weight" hint="kilograms">
            <Input
              type="number"
              min={20}
              max={300}
              step={0.1}
              value={profile.weight_kg ?? ''}
              onChange={e => set('weight_kg')(e.target.value || null)}
              placeholder="e.g. 72.5"
            />
          </Field>
          <Field label="Height" hint="centimetres">
            <Input
              type="number"
              min={100}
              max={250}
              step={0.1}
              value={profile.height_cm ?? ''}
              onChange={e => set('height_cm')(e.target.value || null)}
              placeholder="e.g. 170"
            />
          </Field>
        </Section>

        {/* Diabetes Diagnosis */}
        <Section icon={Heart} title="Diabetes Diagnosis">
          <Field label="Diabetes type">
            <Select
              value={profile.diabetes_type}
              onChange={set('diabetes_type')}
              options={DIABETES_TYPE_OPTIONS}
            />
          </Field>
          <Field label="Year of diagnosis">
            <Input
              type="number"
              min={1920}
              max={new Date().getFullYear()}
              value={profile.diagnosis_year ?? ''}
              onChange={e =>
                set('diagnosis_year')(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="e.g. 2015"
            />
          </Field>
        </Section>

        {/* Insulin & Medications */}
        <Section icon={Syringe} title="Insulin & Medications">
          <Field label="On insulin?" full>
            <div className="flex gap-4 mt-1">
              {(['Yes', 'No'] as const).map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="on_insulin"
                    checked={profile.on_insulin === (opt === 'Yes')}
                    onChange={() => set('on_insulin')(opt === 'Yes')}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
          </Field>

          {profile.on_insulin && (
            <>
              <Field label="Insulin regimen">
                <Select
                  value={profile.insulin_regimen}
                  onChange={set('insulin_regimen')}
                  options={INSULIN_REGIMEN_OPTIONS}
                />
              </Field>
              <Field label="Insulin brand(s)" hint="e.g. Novorapid + Lantus">
                <Input
                  value={profile.insulin_type}
                  onChange={e => set('insulin_type')(e.target.value)}
                  placeholder="e.g. Novorapid + Lantus"
                />
              </Field>
              <Field
                label="Insulin-to-carb ratio"
                hint="Grams of carbs per 1 unit (e.g. 10 means 1:10)"
              >
                <Input
                  type="number"
                  min={1}
                  max={100}
                  step={0.5}
                  value={profile.insulin_to_carb_ratio ?? ''}
                  onChange={e => set('insulin_to_carb_ratio')(e.target.value || null)}
                  placeholder="e.g. 10"
                />
              </Field>
              <Field
                label="Insulin sensitivity factor"
                hint="mmol/L drop per 1 correction unit (e.g. 2.5)"
              >
                <Input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.1}
                  value={profile.insulin_sensitivity_factor ?? ''}
                  onChange={e => set('insulin_sensitivity_factor')(e.target.value || null)}
                  placeholder="e.g. 2.5"
                />
              </Field>
            </>
          )}

          <Field label="Other medications" full hint="List any non-insulin medications">
            <Textarea
              value={profile.other_medications}
              onChange={set('other_medications')}
              placeholder="e.g. Metformin 500 mg twice daily, Ramipril 5 mg"
            />
          </Field>
        </Section>

        {/* Targets & Monitoring */}
        <Section icon={Target} title="Targets & Monitoring">
          <Field label="Target BG minimum" hint="mmol/L">
            <Input
              type="number"
              min={2}
              max={15}
              step={0.1}
              value={profile.target_bg_min ?? ''}
              onChange={e => set('target_bg_min')(e.target.value || null)}
              placeholder="e.g. 4.0"
            />
          </Field>
          <Field label="Target BG maximum" hint="mmol/L">
            <Input
              type="number"
              min={2}
              max={20}
              step={0.1}
              value={profile.target_bg_max ?? ''}
              onChange={e => set('target_bg_max')(e.target.value || null)}
              placeholder="e.g. 10.0"
            />
          </Field>
          <Field label="Most recent HbA1c" hint="%">
            <Input
              type="number"
              min={3}
              max={20}
              step={0.1}
              value={profile.last_hba1c ?? ''}
              onChange={e => set('last_hba1c')(e.target.value || null)}
              placeholder="e.g. 6.8"
            />
          </Field>
          <Field label="Glucose monitoring method">
            <Select
              value={profile.monitoring_method}
              onChange={set('monitoring_method')}
              options={MONITORING_OPTIONS}
            />
          </Field>
          {(profile.monitoring_method === 'cgm' || profile.monitoring_method === 'both') && (
            <Field label="CGM device" hint="e.g. Dexcom G7, Libre 3">
              <Input
                value={profile.cgm_device}
                onChange={e => set('cgm_device')(e.target.value)}
                placeholder="e.g. Dexcom G7"
              />
            </Field>
          )}
        </Section>

        {/* Lifestyle & Goals */}
        <Section icon={Salad} title="Lifestyle & Goals">
          <Field label="Activity level" full>
            <Select
              value={profile.activity_level}
              onChange={set('activity_level')}
              options={ACTIVITY_OPTIONS}
            />
          </Field>
          <Field label="Dietary restrictions / preferences" full>
            <Textarea
              value={profile.dietary_restrictions}
              onChange={set('dietary_restrictions')}
              placeholder="e.g. vegetarian, gluten-free, low-carb, dairy-free"
            />
          </Field>
          <Field label="Other health conditions" full hint="Conditions that may affect diabetes management">
            <Textarea
              value={profile.other_conditions}
              onChange={set('other_conditions')}
              placeholder="e.g. hypertension, coeliac disease, PCOS, chronic kidney disease"
            />
          </Field>
          <Field label="Management goals" full hint="What would you like to achieve?">
            <Textarea
              value={profile.management_goals}
              onChange={set('management_goals')}
              placeholder="e.g. Reduce HbA1c below 7%, spend more time in range, understand carb counting"
            />
          </Field>
        </Section>

        {/* Save footer */}
        <div className="flex items-center justify-between pb-8">
          <p className="text-xs text-slate-400">
            Your data is used only to personalise Gluko&apos;s responses.
          </p>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving…' : 'Save profile'}
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  )
}
