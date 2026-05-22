const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export interface AuthTokens {
  access: string
  refresh: string
}

export interface User {
  id: number
  email: string
}

export interface RegisterResponse {
  user: User
  tokens: AuthTokens
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || error.email?.[0] || error.password?.[0] || 'Request failed')
  }

  if (res.status === 204 || res.status === 205) return undefined as T
  return res.json()
}

// ── Chat types ──────────────────────────────────────────
export interface ChatSession {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  agent_used?: string
  intent?: string
  created_at: string
}

export const chatApi = {
  getSessions: (token: string) =>
    request<ChatSession[]>('/chat/sessions/', {}, token),

  createSession: (token: string, title?: string) =>
    request<ChatSession>('/chat/sessions/', {
      method: 'POST',
      body: JSON.stringify({ title: title || '' }),
    }, token),

  deleteSession: (token: string, sessionId: number) =>
    request<void>(`/chat/sessions/${sessionId}/`, { method: 'DELETE' }, token),

  getMessages: (token: string, sessionId: number) =>
    request<ChatMessage[]>(`/chat/sessions/${sessionId}/messages/`, {}, token),

  sendMessage: (token: string, sessionId: number, message: string) =>
    request<ChatMessage>(`/chat/sessions/${sessionId}/messages/`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }, token),

  uploadMedia: async (
    token: string,
    sessionId: number,
    kind: 'image' | 'audio',
    file: Blob,
    filename: string,
    hint?: string,
  ): Promise<ChatMessage> => {
    const fd = new FormData()
    fd.append(kind, file, filename)
    if (hint) fd.append('message', hint)

    const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/upload/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // no Content-Type — browser sets the boundary
      body: fd,
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(e.detail || 'Upload failed')
    }
    return res.json()
  },
}

// ── Auth ────────────────────────────────────────────────
export const authApi = {
  register: (email: string, password: string, passwordConfirm: string) =>
    request<RegisterResponse>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ email, password, password_confirm: passwordConfirm }),
    }),

  login: (email: string, password: string) =>
    request<AuthTokens>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  refresh: (refreshToken: string) =>
    request<{ access: string; refresh: string }>('/auth/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    }),

  logout: (accessToken: string, refreshToken: string) =>
    request<void>('/auth/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    }, accessToken),
}

// ── Log types ──────────────────────────────────────────

export interface GlucoseLog {
  id: number
  value_mgdl: number
  measurement_context: string
  notes: string
  logged_at: string
}

export interface InsulinLog {
  id: number
  units: string
  insulin_type: string
  insulin_brand: string
  injection_site: string
  notes: string
  logged_at: string
}

export interface MealLog {
  id: number
  description: string
  estimated_carbs: string | null
  carb_source: string
  image_url: string
  meal_type: string
  notes: string
  logged_at: string
}

export interface SportLog {
  id: number
  activity_type: string
  duration_min: number
  intensity: string
  glucose_before: number | null
  glucose_after: number | null
  notes: string
  logged_at: string
}

export interface BolusResult {
  id: number
  meal_dose: number
  correction_dose: number
  total_dose: number
  formula: { meal: string; correction: string }
  disclaimer: string
}

export interface BolusCalculation {
  id: number
  carbohydrates_g: string
  current_glucose: string
  target_glucose: string
  icr_used: string
  isf_used: string
  meal_dose: string
  correction_dose: string
  total_dose: string
  calculated_at: string
}

export const logsApi = {
  getGlucose: (token: string, date?: string) =>
    request<GlucoseLog[]>(`/logs/glucose/${date ? `?date=${date}` : ''}`, {}, token),
  createGlucose: (token: string, data: Partial<GlucoseLog>) =>
    request<GlucoseLog>('/logs/glucose/', { method: 'POST', body: JSON.stringify(data) }, token),
  deleteGlucose: (token: string, id: number) =>
    request<void>(`/logs/glucose/${id}/`, { method: 'DELETE' }, token),

  getInsulin: (token: string, date?: string) =>
    request<InsulinLog[]>(`/logs/insulin/${date ? `?date=${date}` : ''}`, {}, token),
  createInsulin: (token: string, data: Partial<InsulinLog>) =>
    request<InsulinLog>('/logs/insulin/', { method: 'POST', body: JSON.stringify(data) }, token),
  deleteInsulin: (token: string, id: number) =>
    request<void>(`/logs/insulin/${id}/`, { method: 'DELETE' }, token),

  getMeals: (token: string, date?: string) =>
    request<MealLog[]>(`/logs/meals/${date ? `?date=${date}` : ''}`, {}, token),
  createMeal: (token: string, data: Partial<MealLog>) =>
    request<MealLog>('/logs/meals/', { method: 'POST', body: JSON.stringify(data) }, token),
  deleteMeal: (token: string, id: number) =>
    request<void>(`/logs/meals/${id}/`, { method: 'DELETE' }, token),

  getSport: (token: string, date?: string) =>
    request<SportLog[]>(`/logs/sport/${date ? `?date=${date}` : ''}`, {}, token),
  createSport: (token: string, data: Partial<SportLog>) =>
    request<SportLog>('/logs/sport/', { method: 'POST', body: JSON.stringify(data) }, token),
  deleteSport: (token: string, id: number) =>
    request<void>(`/logs/sport/${id}/`, { method: 'DELETE' }, token),
}

export interface DashboardSummary {
  date: string
  glucose: {
    latest: { value_mgdl: number; context: string; logged_at: string } | null
    count: number
    avg: number | null
    min: number | null
    max: number | null
  }
  insulin: {
    total_units: number
    count: number
    entries: { id: number; units: string; insulin_type: string; logged_at: string }[]
  }
  meals: {
    total_carbs: number
    count: number
    entries: { id: number; description: string; estimated_carbs: string | null; meal_type: string; logged_at: string }[]
  }
  sport: {
    total_minutes: number
    count: number
    entries: { id: number; activity_type: string; duration_min: number; intensity: string; logged_at: string }[]
  }
}

export interface TrendDay {
  date: string
  glucose_avg: number | null
  glucose_min: number | null
  glucose_max: number | null
  glucose_count: number
  insulin_total: number
  carbs_total: number
  sport_minutes: number
  sport_count: number
}

export interface TrendsData {
  period_days: number
  daily: TrendDay[]
  summary: {
    glucose_avg: number | null
    glucose_in_range_pct: number | null
    insulin_avg_daily: number | null
    carbs_avg_daily: number | null
  }
}

export const dashboardApi = {
  getSummary: (token: string) =>
    request<DashboardSummary>('/logs/dashboard/summary/', {}, token),
  getTrends: (token: string, days: number = 7) =>
    request<TrendsData>(`/logs/dashboard/trends/?days=${days}`, {}, token),
}

export const bolusApi = {
  calculate: (token: string, carbohydrates_g: string, current_glucose: string) =>
    request<BolusResult>('/logs/bolus/calculate/', {
      method: 'POST',
      body: JSON.stringify({ carbohydrates_g, current_glucose }),
    }, token),
  getHistory: (token: string) =>
    request<BolusCalculation[]>('/logs/bolus/history/', {}, token),
}

// ── Profile types ───────────────────────────────────────
export interface UserProfile {
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string
  weight_kg: string | null
  height_cm: string | null
  diabetes_type: string
  diagnosis_year: number | null
  on_insulin: boolean
  insulin_regimen: string
  insulin_type: string
  insulin_to_carb_ratio: string | null
  insulin_sensitivity_factor: string | null
  target_bg_min: string | null
  target_bg_max: string | null
  last_hba1c: string | null
  monitoring_method: string
  cgm_device: string
  other_medications: string
  other_conditions: string
  dietary_restrictions: string
  activity_level: string
  management_goals: string
}

export const profileApi = {
  get: (token: string) =>
    request<UserProfile>('/auth/profile/', {}, token),

  update: (token: string, data: Partial<UserProfile>) =>
    request<UserProfile>('/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    }, token),
}
