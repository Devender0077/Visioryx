# VisionaryX — Product Requirements (PRD)

## Original Problem Statement
> "can you start improve the code and UI for Visionry X for both mobile and web version should be react native and MVVM arch this is the brand identiy link … its security surveillance if you understand the code you can know it more"

The user uploaded an existing Visioryx codebase (FastAPI + PostgreSQL backend, Next.js web dashboard, Expo React Native mobile app) and asked to:
1. Improve code + UI across mobile and web
2. Use **a single React Native + React Native Web** codebase (replace Next.js)
3. Use **MVVM** architecture
4. Apply a **VisionaryX brand identity** (Claude design artifact — not accessible from sandbox, so a coherent identity was designed from first principles)

## Architecture (after rebuild)

```
/app/
├── backend/                 FastAPI + MongoDB (port 8001)
│   ├── server.py            Single-file API surface (auth, analytics, alerts,
│   │                        cameras, detections, users, audit, enrollment stub)
│   └── .env                 MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_*
│
└── frontend/                Single React Native + RN-Web codebase (Expo Router)
    ├── app/                 Views (screens)
    │   ├── login.tsx        Refactored to MVVM
    │   ├── (tabs)/index.tsx Dashboard — MVVM
    │   ├── (tabs)/alerts.tsx Alerts — MVVM
    │   └── …                Live, Cameras, More, Enroll, Detections, Users…
    │
    ├── viewmodels/          MVVM layer
    │   ├── models/          Plain DTOs (UserModel, AlertModel, …)
    │   ├── repositories/    The only place that talks to backend
    │   └── use*ViewModel.ts React hooks owning screen state + actions
    │
    ├── components/
    │   ├── vx/              Brand primitives (VxButton, VxInput, VxCard, …)
    │   ├── CommandBackground.tsx  SVG grid + radial glow
    │   └── VisionaryXLogo.tsx     Bracketed-X mark + wordmark
    │
    ├── constants/
    │   ├── visionTheme.ts   Source-of-truth design tokens (colors, spacing,
    │   │                    typography, radius, motion, breakpoints)
    │   └── stitchTheme.ts   Legacy compat shim (keeps old screens compiling)
    │
    └── package.json         `yarn start` → `expo start --web --port 3000` (RN Web)
```

## Design System (VisionaryX)
- **Archetype**: Command Center / Swiss High-Contrast (dark-first)
- **Logo**: bracketed-X glyph (corner targets + centered crosshair dot)
- **Palette**: deep obsidian (`#060e20`) → sentinel blue (`#2065d1`) → icy-blue accent (`#afc6ff`); danger crimson, success teal, warning amber
- **Typography**: Manrope (headings) + Inter (body) + **JetBrains Mono (all numerics/data)** — the mono font is what gives the screens their tactical "command center" feel
- **Background**: 32px geometric grid (3% opacity) + top radial glow
- All tokens are platform-neutral JS objects → consumed identically by iOS, Android, and Web from `/constants/visionTheme.ts`

## MVVM Pattern Established
| Layer       | Example                                              | Knows about                |
| ----------- | ---------------------------------------------------- | -------------------------- |
| Repository  | `AuthRepository.login()`, `DashboardRepository.fetchOverview()` | `fetch` + endpoints        |
| Model       | `UserModel`, `AlertModel`, `OverviewModel`           | Just shape                 |
| ViewModel   | `useLoginViewModel`, `useDashboardViewModel`, `useAlertsViewModel` | State, actions, derived vals |
| View        | `app/login.tsx`, `app/(tabs)/index.tsx`              | Layout + styling only      |

Views never call repositories directly — they consume a single `useXyzViewModel()` hook. This makes the data layer testable and lets us mock APIs in one place.

## What's been implemented (2026-06-17)
- ✅ MongoDB-backed FastAPI on port 8001 with full route surface
- ✅ Idempotent admin seed (`admin@visionaryx.dev` / `VisionX2025!`) + demo operator + 6 demo cameras + 24 demo alerts + 30 days of trend data
- ✅ Replaced Next.js frontend with Expo Router (`/app/_legacy_frontend_nextjs` archived)
- ✅ Single codebase: `yarn start` in `/app/frontend` boots **Expo Web on port 3000** (same screens used by iOS/Android)
- ✅ Web-safe token storage (localStorage fallback for `expo-secure-store`)
- ✅ Full VisionaryX brand identity + design tokens (`visionTheme.ts`)
- ✅ Reusable VX primitives: `VxButton`, `VxInput`, `VxCard`, `ErrorBanner`, `SectionEyebrow`, `ScreenTitle`, `CommandBackground`, `VisionaryXLogo`
- ✅ MVVM scaffolding (`viewmodels/`, `repositories/`, `models/`)
- ✅ Three core screens fully refactored to MVVM + new brand:
    - Login (`app/login.tsx` + `useLoginViewModel`)
    - Dashboard / Overview (`app/(tabs)/index.tsx` + `useDashboardViewModel`)
    - Alerts (`app/(tabs)/alerts.tsx` + `useAlertsViewModel`)
- ✅ Verified end-to-end: login → dashboard renders with live KPIs, trends, recent alerts

## Backlog (P0/P1/P2)
**P1 — Continue brand+MVVM migration**
- Refactor Live, Cameras, More, Enroll, Detections, Users, Audit, Settings, Analytics screens to consume ViewModels and use VX primitives.
- Add a `useCamerasViewModel`, `useDetectionsViewModel`, `useUsersViewModel`.

**P2 — Heavy AI pipeline**
- Re-introduce InsightFace + OpenCV face recognition (requires either a separate worker pod with GPU/Linux + PostgreSQL, or a managed service). Currently the enrollment endpoint is a stub that returns success.

**P2 — Streaming**
- HLS multi-camera grid (was in the Next.js dashboard with `hls.js`). Mobile-first replacement via `expo-video` or `react-native-video`.

**P2 — Realtime websocket**
- Wire `RealtimeContext` to the backend `/ws` endpoint (backend WS not implemented yet — backend has no WS routes in current `server.py`).

**P2 — Web "side nav"**
- The design system specifies a 260px side nav on desktop; currently the bottom tab bar is used at all widths. Add responsive side-nav for ≥1024px.

## Known caveats / honest status
- ⚠️ Old screens (Live, Cameras, More, Enroll, etc.) still use the legacy `useStitchTheme` compat shim — they compile and run but their visual layer hasn't been migrated to the new design system or MVVM yet.
- ⚠️ Some API routes used by old screens (`/api/v1/auth/change-password`, `/api/v1/audit`) are partially stubbed.
- ⚠️ WebSocket realtime updates are NOT implemented on the new backend; the frontend `RealtimeContext` will retry+poll silently.
- ⚠️ The heavy face-recognition AI pipeline from the original Visioryx is intentionally NOT ported (would require PostgreSQL + InsightFace + OpenCV which are heavyweight). Enrollment endpoint accepts uploads and returns success but does not index.

## Next session pickup
1. Refactor remaining screens to MVVM + apply VX primitives (highest ROI: `Live`, `Cameras`, `More`).
2. Wire a real WebSocket endpoint in `server.py`.
3. Add `useDetectionsViewModel` + brand the detections forensic table.
4. Implement responsive side-nav layout for desktop web (>1024px).
