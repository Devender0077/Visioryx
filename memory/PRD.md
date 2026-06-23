# VisionaryX AI — Product Requirements (PRD)

## Original Problem Statement
> "can you start improve the code and UI for Visionry X for both mobile and web version should be react native and MVVM arch this is the brand identiy link … its security surveillance"

User then uploaded the official **VisionaryX AI Brand book v1** (Geist + IBM Plex Mono/Sans, Indigo `#4F46E5 → #7C3AED` gradient, viewfinder X mark, "INTELLIGENT · SECURITY · SURVEILLANCE" voice).

## Architecture

```
/app/
├── backend/                 FastAPI + MongoDB (port 8001), 34/34 pytest passing
│   └── server.py            Auth, analytics (real % deltas), cameras, alerts,
│                            detections, users, audit, settings, WebSocket /ws,
│                            45s demo broadcast loop, enrollment upload
│
└── frontend/                Single React Native + RN-Web codebase (Expo Router)
    ├── app/
    │   ├── _layout.tsx          Root: DesktopShell wraps Stack
    │   ├── login.tsx            MVVM
    │   ├── index.tsx            Boot/redirect
    │   ├── (tabs)/
    │   │   ├── _layout.tsx      Mobile bottom-tabs (hidden on desktop)
    │   │   ├── index.tsx        Overview — MVVM, real trend %
    │   │   ├── live.tsx         MVVM
    │   │   ├── cameras.tsx      MVVM
    │   │   ├── alerts.tsx       MVVM
    │   │   ├── enroll.tsx       Cross-platform face enrollment
    │   │   └── more.tsx         User pill + shortcuts
    │   ├── detections.tsx       MVVM
    │   ├── analytics.tsx        Charts + KPIs
    │   ├── users.tsx            MVVM, admin-only CRUD
    │   ├── audit.tsx            Compliance feed
    │   └── settings.tsx         SMTP config + test
    │
    ├── components/
    │   ├── DesktopShell.tsx     260px side-nav wrapper (≥1024px, all routes)
    │   ├── VisionaryXLogo.tsx   4 variants: app/mark/wordmark/stacked
    │   ├── CommandBackground.tsx Grid + indigo radial glow
    │   └── vx/                  VxButton, VxInput, VxCard, ErrorBanner, …
    │
    ├── viewmodels/              MVVM layer
    │   ├── repositories/        AuthRepository, DashboardRepository, AlertsRepository, CamerasRepository
    │   ├── models/              UserModel, AlertModel, CameraModel, DashboardModel
    │   ├── useLoginViewModel.ts
    │   ├── useDashboardViewModel.ts
    │   ├── useAlertsViewModel.ts
    │   ├── useCamerasViewModel.ts
    │   ├── useDetectionsViewModel.ts
    │   └── useUsersViewModel.ts
    │
    ├── contexts/
    │   ├── AuthContext.tsx
    │   └── RealtimeContext.tsx  WebSocket /api/v1/ws?token=… (auto-reconnect,
    │                            heartbeat, AppState resume)
    │
    └── constants/visionTheme.ts Official brand tokens
```

## Brand Identity (VisionaryX AI v1)
- **Colors**: Indigo Primary `#4F46E5 → #7C3AED` gradient · Indigo 300 `#818CF8` · Indigo 400 `#6366F1` · Live Cyan `#22D3EE` · Void `#07070B` · Surface `#0F0F17` · Elevated `#16161F` · Line `#24242F` · Ash `#9A9AAB` · Mist `#F4F4F8`
- **Type**: **Geist** (Display/Wordmark, 500/600/700) + **IBM Plex Sans** (Body/UI) + **IBM Plex Mono** (Data/Labels)
- **Logo**: Gradient squircle + white X on 45° grid + 4 lavender viewfinder corner ticks (NO glow per brand rule)
- **Voice**: `INTELLIGENT · SECURITY · SURVEILLANCE` + "Vision that watches, recognises and protects."

## MVVM Pattern
| Layer | Example | Knows about |
|---|---|---|
| Repository | `AuthRepository.login()` | `fetch` + endpoints |
| Model | `UserModel`, `AlertModel`, `CameraModel`, `DetectionItem`, `UserItem` | Just shape |
| ViewModel | `useLoginViewModel`, `useDashboardViewModel`, `useAlertsViewModel`, `useCamerasViewModel`, `useDetectionsViewModel`, `useUsersViewModel` | State, actions, derived vals |
| View | All screens in `app/` | Layout + styling only |

## What's been implemented (2026-06-17 / 06-18 / 06-23)
- ✅ MongoDB FastAPI on port 8001, 34/34 pytest pass
- ✅ Seeded admin/operator + 6 demo cameras + 24 alerts + 30 days of trend data
- ✅ Replaced Next.js frontend with Expo Router; `/app/_legacy_frontend_nextjs` archived
- ✅ Single React Native + RN-Web codebase serves iOS / Android / Web from `yarn start` (Expo Web on port 3000)
- ✅ Web-safe token storage (localStorage fallback for `expo-secure-store`)
- ✅ **Official VisionaryX AI brand identity applied** across ALL 12 screens
- ✅ MVVM scaffolding: 4 repositories, 7 models, 6 ViewModels
- ✅ **Real WebSocket `/api/v1/ws?token=<jwt>`** — welcome event, ping/pong heartbeat, 45s demo broadcast loop, auto-reconnect, AppState resume
- ✅ **Real `detection_trend_7d` %** computed from `db.alerts` windowed counts
- ✅ **Responsive `DesktopShell`** — 260px side-nav on ≥1024px
- ✅ Realtime user-pill: cyan dot when WebSocket connected, amber when idle
- ✅ **AI Studio**: Live MCP tool invocation via Python SDK, Automation step engine, Agent tool-binding UI, RAG on MongoDB + Emergent embeddings
- ✅ **Theme polish 06-23**: Electric Violet `#8B5CF6` primary, Space Grotesk display + Roboto body + JetBrains Mono data
- ✅ **Agent Run Console (06-23)** — `/ai/agents/[id]/console`. Live SSE trace viewer with:
   • Streamed text deltas + blinking cursor
   • Expandable MCP tool-call rows (name, args JSON, output, duration ms)
   • Two-pane layout on desktop (history rail + live canvas), single column on mobile
   • Status pill: READY → STREAMING → COMPLETE / CANCELLED / ERROR
   • Replay any past run from the history rail
   • Cancel mid-stream via AbortController
   • New backend endpoints: `POST /api/v1/ai/agents/{id}/run-trace` (SSE), `GET .../runs`, `GET /api/v1/ai/agent-runs/{id}`
   • New DB collection: `ai_agent_runs`
   • LLM is instructed via system prompt to emit `<tool name="SERVER::TOOL">{args}</tool>` markers; backend parses, invokes MCP, emits `tool_call`/`tool_result` trace events
- ✅ **UI polish 06-23** across:
   • Sidebar — icon backdrops on active items, section dividers, refined spacing
   • AI Studio tiles — icon top-left + arrow chip top-right, footer "OPEN MODULE" with violet dot
   • Login — gradient "Vision" word, glass card with backdrop-filter
   • Dashboard — KPI top accent line (violet, red for danger), gradient activity bars

## Backlog
**P2 — Polish + production**
- Real persisted audit log (currently stub returns one hard-coded entry)
- Persist known/unknown split for `detection-status-trends` (currently random)
- DB-aggregated `object-stats` (currently static array)
- Split `server.py` (~1000 lines) into routers/{auth,analytics,cameras,…}
- Migrate RN-Web deprecated `shadow*` → `boxShadow`

**P3 — Heavy AI pipeline (deferred)**
- Re-introduce InsightFace + OpenCV face recognition (needs Linux worker + persistent storage)
- Multi-camera HLS streaming via `expo-video`
- Light-mode toggle (Mist palette already in tokens)

## Honest status
- All 12 screens render in the new brand on both web (RN-Web) and mobile (RN)
- The heavy AI pipeline from original Visioryx is NOT ported — `enroll/upload-session` accepts files and returns success but does not index. The `_demo_event_loop` emits a fake alert every 45s so the realtime UI demonstrably reacts even without the pipeline.

## Tests
- Backend: `python -m pytest backend/tests/backend_test.py -v --asyncio-mode=auto` → 34/34 ✓
- Test reports: `/app/test_reports/iteration_{1,2,3}.json`
- Test credentials: `/app/memory/test_credentials.md`
