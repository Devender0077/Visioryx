# Visioryx — Mobile app UI prompt (for Stitch / Figma AI / design handoff)

Copy everything below the line into your design tool as a single prompt. Replace bracketed placeholders when you know your deployment URLs.

---

## Product

**Visioryx** is an AI-powered surveillance dashboard: live RTSP camera streams, face recognition (known vs unknown), optional YOLO object detection, alerts, analytics, and user enrollment via QR/email.

**Backend:** FastAPI REST + WebSocket (`/ws`) + MJPEG streams.  
**Web app:** Next.js (reference); mobile app should consume the **same API** (`/api/v1/...`) with JWT Bearer auth.

## Brand & UX principles

- **Name:** Visioryx  
- **Feel:** Professional security / enterprise SaaS — clean, high contrast, calm (not “gaming”).  
- **Primary accent:** Blue `#2065D1` (trust, clarity).  
- **Success:** Green `#00AB55`; **warning:** amber `#FFAB00`; **danger:** `#FF5630`.  
- **Dark mode friendly:** Support light default + optional dark (match system).  
- **Accessibility:** WCAG AA contrast; touch targets ≥ 44pt; readable tabular numbers for timestamps.

## Tech constraints (for developers later)

- **Auth:** Login returns JWT; store securely (Keychain / EncryptedSharedPreferences); attach `Authorization: Bearer <token>` on API calls.  
- **Realtime:** WebSocket at same host as API for events (`face_recognized`, `unknown_person_detected`, `object_detected`, `camera_status`). Reconnect with backoff.  
- **Video:** MJPEG URLs are long-lived; use native `Image`/WebView or platform video component; avoid loading many HD streams at once on cellular.  
- **Enrollment:** Public flow `/enroll?token=...` (no admin JWT); multi-step photos + upload.  
- **Deep links:** `visioryx://` or HTTPS universal links for alerts and enrollment.

## User roles (mirror web)

1. **Admin** — full access + Email/SMTP settings + audit-style actions.  
2. **Operator** — live, cameras, users, detections, analytics, alerts, profile (no SMTP settings).  
3. **Enrollee** — only enrollment + profile (restricted home).

Design **role-based navigation** (hide admin-only items).

## Screen list (minimum viable)

### Auth & onboarding

1. **Splash** — logo, version, “Sign in”.  
2. **Login** — email, password, error states, “Forgot password” optional (if API supports).  
3. **Register** (if enabled) — only if product keeps public registration.

### Main shell

4. **Home / Overview** — KPI cards: total users, cameras, today’s detections, unknown today; optional “live” connection chip; shortcuts to Live / Detections / Alerts.  
5. **Bottom navigation (or rail)** — Overview | Live | Cameras | Alerts | More (or Detections + Analytics under More).

### Live monitoring

6. **Live grid** — list of cameras with name + Live/Stopped; tap opens **Camera viewer** (full-bleed MJPEG or placeholder when stopped).  
7. **Camera viewer** — toolbar: reconnect, zoom, fullscreen; safe area for notched phones; low bandwidth mode (smaller preview / fewer FPS) as optional toggle.

### Cameras

8. **Camera list** — name, status chip, masked RTSP (dots) with **reveal** behind confirmation/biometric optional.  
9. **Add / Edit camera** — name, RTSP URL (masked field + show/hide), save/cancel. Admin-only if that matches API.

### Users (admin/operator)

10. **Users list** — search, pagination, face status (enrolled / not), actions: view photo, QR enrollment, email link, upload, delete.  
11. **QR enrollment modal** — QR + copy link + expiry note.  
12. **Register user** — name + email form.

### Detections & analytics

13. **Detections** — filter by camera, status, search; table or cards; export CSV action in overflow menu.  
14. **Analytics** — charts: trends (7/14/30d), known vs unknown, by camera, object types; empty states.

### Alerts

15. **Alerts** — list with read/unread styling, search, filters, **Mark all read** / **Mark all unread**, single-tap mark read.  
16. **Alert detail** (optional) — full message, timestamp, severity.

### Profile & settings

17. **Profile** — email, change password, optional YOLO toggle (admin), app version.  
18. **Email & SMTP** (admin only) — host, port, TLS, from address, public URL for links, test email.

### Enrollment (public / enrollee)

19. **Enrollment wizard** — verify token → steps for face photos (straight / left / right) → review → done; camera permission prompts; errors for expired token.

### System

20. **Audit log** (admin) — chronological actions (who did what, when) with export.  
21. **Empty & error states** — no cameras, no detections, offline/API error with retry.

## Deliverables from the design tool

- **Mobile** portrait frames: iPhone 15 Pro (393×852) and one Android reference (e.g. Pixel 7).  
- **Components:** buttons, chips, cards, list rows, bottom nav, app bar, dialogs, snackbars, skeleton loaders.  
- **Flows:** Login → Overview → Live → single camera; Alerts mark-all; Enrollment happy path + error.  
- **Export:** PDF or PNG screens + **component list** (spacing, typography scale).

## API base URL (for prototypes)

- Dev: `http://<LAN-IP>:8000/api/v1` or same-origin via reverse proxy.  
- Prod: `https://<your-domain>/api/v1`

## Non-goals for v1 mobile

- On-device ML inference (all AI on server).  
- Replacing RTSP with proprietary protocol without backend change.

---

_End of prompt — paste into Stitch / your UI generator, then share exported screens + component notes for implementation._
