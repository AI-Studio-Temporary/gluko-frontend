# Gluko Frontend Memory

## Project
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Package manager: npm
- Run dev: `npm run dev`

## Auth System (implemented)
- Backend JWT endpoints at `NEXT_PUBLIC_API_URL/auth/` (login, register, refresh, logout)
- Access token: stored in React Context (memory), also sets `gluko_auth=1` cookie for middleware
- Refresh token: stored in `localStorage` under key `gluko_refresh`
- Refresh tokens rotate — always update localStorage on refresh call
- `src/middleware.ts` — protects all routes except `/login`, `/register`, `/`
- `src/contexts/AuthContext.tsx` — AuthProvider + useAuth hook
- `src/lib/api.ts` — typed API client (authApi)

## Key Files
- `src/lib/utils.ts` — cn() utility (clsx + tailwind-merge)
- `src/components/ui/` — manual shadcn-style components (Button, Input, Label)
- `src/app/(auth)/login/page.tsx` — login form
- `src/app/(auth)/register/page.tsx` — register form with password strength indicator
- `src/app/dashboard/page.tsx` — protected dashboard (placeholder stats)

## UI Conventions
- Color scheme: blue-600 primary, slate neutrals, emerald/orange/violet for stats
- Cards: `rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100`
- Auth layout: gradient `from-slate-50 via-blue-50 to-indigo-100`
- No shadcn CLI — components written manually (CVA + Radix primitives)
