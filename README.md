# Gluko Frontend

Next.js 14 frontend for **Gluko** — an AI-powered diabetes assistant that helps users estimate carbohydrates, calculate insulin bolus doses, log health data, and interact with an AI tutor.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Prerequisites](#3-prerequisites)
4. [Running with Docker (Recommended)](#4-running-with-docker-recommended)
5. [Running Locally Without Docker](#5-running-locally-without-docker)
6. [Project Structure](#6-project-structure)
7. [Tailwind CSS](#7-tailwind-css)
8. [Connecting to the Backend](#8-connecting-to-the-backend)
9. [Environment Variables](#9-environment-variables)
10. [Adding shadcn/ui Components](#10-adding-shadcnui-components)
11. [Common Commands](#11-common-commands)
12. [Troubleshooting](#12-troubleshooting)
13. [Branch and Contribution Workflow](#13-branch-and-contribution-workflow)

---

## 1. Project Overview

The Gluko frontend is a Next.js 14 application using the App Router. It communicates with the Django REST API backend using JWT tokens for authentication.

**Key pages (planned by sprint):**

| Sprint | Pages |
|--------|-------|
| 1 | Landing, Login/Register, Dashboard, Carb Estimator (text), Bolus Calculator |
| 2 | Carb Estimator (image upload), Health logs, Profile settings |
| 3 | Audio input, AI Tutor chat, A1C Estimator |

---

## 2. Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 14.2.3 | React framework with App Router and SSR |
| React | 18.x | UI library |
| TypeScript | 5.x | Type safety across all components |
| Tailwind CSS | 3.4.x | Utility-first CSS framework |
| PostCSS | 8.x | CSS transformation pipeline (required by Tailwind) |
| Autoprefixer | 10.x | Adds vendor prefixes automatically |
| ESLint | 8.x | Linting with Next.js-specific rules |

---

## 3. Prerequisites

### For Docker usage (recommended)

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Docker Desktop | 24.x | `docker --version` |
| Docker Compose | v2.x | `docker compose version` |

### For local usage (without Docker)

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | 20.x LTS | `node --version` |
| npm | 10.x | `npm --version` |

---

## 4. Setup and Running

The frontend runs locally with Node.js — no Docker needed. The backend runs separately in Docker (see `gluko-backend/README.md`).

### Step 1 - Clone the repository

```bash
git clone git@github-uts:AI-Studio-Temporary/gluko-frontend.git
cd gluko-frontend
```

### Step 2 - Install dependencies

```bash
npm install
```

### Step 3 - Create a local environment file

```bash
# .env.local is loaded automatically by Next.js and is git-ignored
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
```

### Step 4 - Start the development server

```bash
npm run dev
```

The app will be available at http://localhost:3000 with hot-reload enabled.

> **Note:** The backend must be running for API calls to work. Start it first:
> ```bash
> # In a separate console, from gluko-backend/
> docker compose up
> ```

---

## 6. Project Structure

```
gluko-frontend/
|
+-- src/
|   +-- app/                    # Next.js App Router root
|       +-- layout.tsx          # Root layout: HTML shell, global metadata
|       +-- page.tsx            # Home page (/)
|       +-- globals.css         # Global styles + Tailwind directives
|
+-- public/                     # Static assets (images, icons, fonts)
|
+-- Dockerfile                  # Frontend container definition
+-- .dockerignore               # Files excluded from Docker build context
+-- package.json                # Dependencies and npm scripts
+-- next.config.js              # Next.js configuration
+-- tsconfig.json               # TypeScript compiler options
+-- tailwind.config.ts          # Tailwind content paths and theme extension
+-- postcss.config.js           # PostCSS plugins (Tailwind + Autoprefixer)
+-- .env.local                  # Local env overrides (git-ignored)
+-- README.md                   # This file
```

### App Router conventions

The App Router uses a filesystem-based routing model inside `src/app/`:

```
src/app/
+-- layout.tsx              --> shared layout for all routes
+-- page.tsx                --> route: /
+-- dashboard/
|   +-- page.tsx            --> route: /dashboard
|   +-- layout.tsx          --> layout specific to /dashboard/*
+-- auth/
|   +-- login/
|   |   +-- page.tsx        --> route: /auth/login
|   +-- register/
|       +-- page.tsx        --> route: /auth/register
+-- carbs/
|   +-- page.tsx            --> route: /carbs
+-- bolus/
    +-- page.tsx            --> route: /bolus
```

**File naming conventions:**

| File | Purpose |
|------|---------|
| `page.tsx` | Defines a route and its UI |
| `layout.tsx` | Wraps child pages with shared UI (nav, sidebar) |
| `loading.tsx` | Loading UI shown while a page is rendering |
| `error.tsx` | Error boundary for a route segment |
| `not-found.tsx` | 404 page for a route segment |

---

## 7. Tailwind CSS

Tailwind is configured in `tailwind.config.ts`. The `content` array tells Tailwind which files to scan for class names:

```ts
content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
]
```

### How it works

Tailwind scans all files listed in `content`, extracts every class name it finds, and generates a CSS file containing only those classes. This keeps the production CSS bundle small.

### The three Tailwind directives

`src/app/globals.css` contains:

```css
@tailwind base;       /* Resets and base HTML element styles */
@tailwind components; /* Layer for custom component classes */
@tailwind utilities;  /* All utility classes (flex, p-4, text-gray-900, etc.) */
```

### Using Tailwind classes

```tsx
// Example component
export default function Card({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
  )
}
```

### Extending the theme

Add custom values in `tailwind.config.ts` under `theme.extend`:

```ts
theme: {
  extend: {
    colors: {
      gluko: {
        blue: '#2563eb',
        green: '#16a34a',
      }
    },
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
    }
  }
}
```

---

## 8. Connecting to the Backend

The frontend communicates with the Django REST API via the `NEXT_PUBLIC_API_URL` environment variable.

### Making API calls

Create a utility file for API requests:

```ts
// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}
```

### Authentication flow

```ts
// Login and store tokens
const { access, refresh } = await apiFetch('/token/', {
  method: 'POST',
  body: JSON.stringify({ username, password }),
})

// Store in localStorage (or httpOnly cookie for better security)
localStorage.setItem('access_token', access)
localStorage.setItem('refresh_token', refresh)

// Authenticated request
const data = await apiFetch('/profile/', {}, access)
```

### Token refresh

JWT access tokens expire after 60 minutes. Use the refresh token to obtain a new access token:

```ts
const { access } = await apiFetch('/token/refresh/', {
  method: 'POST',
  body: JSON.stringify({ refresh: localStorage.getItem('refresh_token') }),
})
localStorage.setItem('access_token', access)
```

### CORS

The Django backend is configured to accept requests from `http://localhost:3000`. No additional CORS setup is needed for local development. In production, update `CORS_ALLOWED_ORIGINS` in `gluko/settings.py` to include the production frontend URL.

---

## 9. Environment Variables

Next.js uses two types of environment variables:

| Type | Prefix | Available in | Example |
|------|--------|-------------|---------|
| Public (client-side) | `NEXT_PUBLIC_` | Browser and server | `NEXT_PUBLIC_API_URL` |
| Private (server-only) | _(none)_ | Server only | `DATABASE_URL` |

**Available variables:**

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api` | Base URL for all API requests. Exposed to the browser. |

### Where variables come from

When running via Docker Compose, variables come from `gluko-backend/.env` (passed through `env_file` in `docker-compose.yml`).

When running locally, create `gluko-frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

`.env.local` is loaded automatically by Next.js and is git-ignored.

---

## 10. Adding shadcn/ui Components

shadcn/ui provides copy-paste React components built on Radix UI and styled with Tailwind. It is not installed as a package — components are added to your codebase directly.

### Install the CLI

```bash
npx shadcn-ui@latest init
```

When prompted, select:
- Style: Default
- Base colour: Slate
- CSS variables: Yes

### Add a component

```bash
# Add the Button component
npx shadcn-ui@latest add button

# Add multiple components
npx shadcn-ui@latest add card input label
```

Components are added to `src/components/ui/`.

### Use a component

```tsx
import { Button } from '@/components/ui/button'

export default function Page() {
  return <Button variant="outline">Calculate Bolus</Button>
}
```

---

## 11. Common Commands

All commands run from the `gluko-frontend/` directory.

```bash
# Install dependencies
npm install

# Start development server with hot-reload
npm run dev

# Build for production
npm run build

# Start production server (requires build first)
npm start

# Run ESLint
npm run lint

# Type-check without building
npx tsc --noEmit
```

---

## 12. Troubleshooting

### `ENOENT: no such file or directory` on npm install

**Cause:** `package.json` is missing or you are in the wrong directory.

**Fix:**
```bash
pwd  # confirm you are in gluko-frontend/
ls package.json  # confirm it exists
npm install
```

---

### Module not found errors in Docker

**Cause:** `node_modules` inside the container is stale or missing.

**Fix:**
```bash
# From gluko-backend/
docker compose build --no-cache frontend
docker compose up
```

---

### Hot-reload not working in Docker

**Cause:** On some systems (particularly Linux), the file watcher inside the container does not detect host filesystem changes.

**Fix:** Add the following to `next.config.js`:

```js
const nextConfig = {
  // ... existing config
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  },
}
```

---

### TypeScript errors after adding shadcn/ui

**Cause:** Missing type definitions or path alias not configured.

**Fix:** Ensure `tsconfig.json` has the path alias:
```json
"paths": { "@/*": ["./src/*"] }
```

Then restart the TypeScript language server in VS Code: `Cmd+Shift+P` -> "TypeScript: Restart TS Server".

---

### `Cannot find module 'next'`

**Cause:** `node_modules` is missing or corrupt.

**Fix:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 13. Branch and Contribution Workflow

Follow the same branch protection rules as the backend. All changes to `main` require a pull request with at least one approval.

```bash
# Create a feature branch
git checkout -b feat/dashboard-page

# Make changes, then stage and commit
git add src/app/dashboard/page.tsx
git commit -m "feat: add dashboard page with glucose summary"

# Push and open a PR
git push -u origin feat/dashboard-page
```

**Commit message convention:**

| Prefix | Use for |
|--------|---------|
| `feat:` | New page, component, or feature |
| `fix:` | Bug fix |
| `style:` | CSS/Tailwind changes with no logic change |
| `refactor:` | Code restructure |
| `chore:` | Config, dependency updates |
