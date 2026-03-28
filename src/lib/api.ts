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

  if (res.status === 205) return undefined as T
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

  getMessages: (token: string, sessionId: number) =>
    request<ChatMessage[]>(`/chat/sessions/${sessionId}/messages/`, {}, token),

  sendMessage: (token: string, sessionId: number, message: string) =>
    request<ChatMessage>(`/chat/sessions/${sessionId}/messages/`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }, token),
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
