# ScanIn - QR Event Check-in System - PRD

**Author:** Harsh
**Stack:** MERN (MongoDB Atlas, Express, React Vite, Node 22)
**Status:** MVP v2.5 (deploy prep)
**Location:** `D:\major_projects\ScanIn`
**Repo name:** `scanin-qr-checkin`
**Product name:** ScanIn — Door ledger

> Rule: every code change updates this PRD (see §13 Changelog).

## 1. Problem Statement
College fests, clubs, workshops still use paper lists or Excel for entry. Results in long queues, double entry, no live count.

ScanIn lets an organizer create an event, share a public registration link, auto-generate a QR ticket per attendee, and let volunteers scan at gate to check-in. Prevents double entry.

## 2. Goals / Non-Goals
Goals:
- Admin can create event in <1 min
- Attendee can register without login and get QR in <30 sec
- Staff can check-in with camera scan OR typed code in <3 sec on phone
- Live count of checked-in vs total, 10s polling
- Mature, print-like UI distinct from generic SaaS

Non-Goals (v1 out of scope):
- Payment / paid tickets
- Email sending (show QR on screen, copy link)
- Multiple sessions per event
- Offline scan

## 3. Users & Roles
1. **Admin** (global) - sees all events, counts as owner everywhere. First account should be admin.
2. **Event team** - per-event roles, displayed inside the event:
   - `owner` - manage team (invite/remove), edit/close/delete event, everything below
   - `coordinator` - edit/close event, walk-ins, scan, view roll
   - `volunteer` - scan + view roll only
   Event creator is owner automatically. Global admins bypass team checks.
3. **Attendee (public, no login)** - verifies via email OTP, gets QR stub.

For MVP demo use 1 admin (owner) + 1-2 staff invited as coordinator/volunteer.

## 4. User Stories
- As Admin, I can login, create event {title, venue, date}
- As Admin, I can copy invitation slip `/r/:eventId` to share on WhatsApp
- As Attendee, I can open slip, enter name + email + mobile + age (all required), receive a 6-digit email OTP, verify it, then get stub page `/t/:code` with QR
- As Staff, I can open `/scan/:eventId`, Start Camera Scan or type code, see Stamped / Seen-before / Not-in-book, with 2.5s de-dupe
- As Admin/Staff, I can see Issued / Stamped / % on EventDetail, auto-refresh 10s
- As Admin, I can close book (`isActive=false`, blocks public register)
- As Staff, I can add walk-in ticket from EventDetail
- As Owner, I can invite teammates by email as coordinator/volunteer (pending if they haven't signed up — auto-join on register), see all members inside the event, remove them or cancel pending invites
- As Coordinator/Volunteer, I only see events I'm on the team of, and I can leave a team myself

## 5. Functional Requirements
### 5.1 Auth
- JWT + bcrypt. Roles in token.
- `POST /api/auth/register {name,email,password,role}` - demo allows admin/staff
- `POST /api/auth/login`
- `GET /api/auth/me`
- Frontend stores token in localStorage, `Authorization: Bearer <token>` via `src/api.js`.
- Register auto-joins events that invited the email while unregistered (pending → member).
- Impl: `backend/routes/auth.js`, `backend/middleware/auth.js`

### 5.2 Events + team
- `POST /api/events` (global admin) - creator becomes `owner` member
- `GET /api/events` (auth) - only events I'm on the team of (admins see all) + `{total, checked, myRole}` per event
- `GET /api/events/:id` (team member) - detail + stats + `myRole` + `team: {members, pending}` (pending only for owners)
- `PUT /api/events/:id` (owner/coordinator) - edit/close; `members/pendingInvites/createdBy` stripped from body
- `DELETE /api/events/:id` (owner) - cascade deletes tickets
- `POST /api/events/:id/team {email, role}` (owner) - invite as coordinator/volunteer; registered email joins at once, unknown email becomes pending (auto-joins on register via `auth.js`)
- `DELETE /api/events/:id/team {userId?|email?}` (owner, or self-leave) - remove member, cancel pending, or leave; creator can't be removed by others; last owner can't be removed
- Ticket list/walk-in/check-in require event team membership (global admins bypass)
- Impl: `backend/routes/events.js`, `backend/routes/tickets.js` (`eventAccess`)

Event fields: title, description, venue, date, category (MUSIC/TECH/FOOD/MEETUP/WORKSHOP/''), isActive default true, createdBy, members[{user, role}], pendingInvites[{email, role}]

### 5.3 Tickets (actual routes)
- `POST /api/tickets/public/:eventId/request-otp` - PUBLIC step 1. {attendeeName, attendeeEmail, mobileNo, age} all required; email regex, 10-digit mobile (tolerates +91/0 prefix), age 5-120. Checks event active, rejects duplicate email per event (409), 60s resend cooldown (429). Creates 6-digit OTP (10-min TTL via `Otp` model), sends via SMTP (`utils/mailer.js`); dev fallback logs OTP, returns it only if `ALLOW_OTP_DEBUG=true`.
- `POST /api/tickets/public/:eventId/verify-otp` - PUBLIC step 2. {attendeeEmail, code}. 5 wrong tries max, then OTP deleted. On success creates ticket, deletes OTP, returns ticket.
- `GET /api/tickets/code/:code` - PUBLIC. Upper-cases code, populates event. For stub page.
- `GET /api/tickets/event/:eventId?search=` (team member) - list max 200, regex on name/email/mobile/code
- `POST /api/tickets/event/:eventId` (team member) - walk-in create, all 4 fields required, duplicate-email guarded
- `POST /api/tickets/checkin {code, eventId}` (auth) - trims/upper-cases, accepts full URL (takes after `/`):
  1. Not found -> 404 `{status:INVALID}`
  2. isUsed -> 400 `{status:ALREADY_USED, ticket}`
  3. Else isUsed=true, usedAt=now, checkedInBy -> 200 `{status:SUCCESS, ticket}`
- Impl: `backend/routes/tickets.js`

Code format: 8-char uppercase, no 0/O/1/I, `crypto.randomBytes`, 3x collision retry. e.g. `K7Q2P9XA`.

### 5.4 Frontend Pages (actual)
- `/login` - `pages/Login.jsx`. Staff-only card, login/register toggle.
- `/` - `pages/Dashboard.jsx`. Post-auth landing per screenshot: dark NOW LIVE card (first open event, Open scanner + Manage team), 4 color tiles (checked in, scanned today via `checkedToday`, tickets left, gate status), Upcoming events cards (category pill, date, venue, sold bar + status) with View all toggle.
- `/events/new` - `pages/NewEvent.jsx`. Dedicated create form incl. category select, redirects to detail.
- `/how-it-works` - `pages/HowItWorks.jsx`. Organizer / attendee / gate flows, CTAs.
- `/events/:id` - `pages/EventDetail.jsx`. Sections anchorable via `#team` / `#tickets` for header nav. Dossier + Issued/Stamped/% + invitation slip copy + Take the door + Form 02 walk-in + roll table with search.
- `/r/:eventId` - `pages/PublicRegister.jsx`. No nav. 2-step verified card: details (name/email/mobile/age, all required) → 6-digit email OTP → ticket. Public axios (no token).
- `/t/:code` - `pages/MyTicket.jsx`. Boarding-pass `card ticket` + `ticket-stub` perforation, `qrcode.react QRCodeSVG value=code size 130`, large mono code.
- `/scan/:eventId` - `pages/Scan.jsx`. Door terminal. Manual mono input + Stamp button + Open lens camera (`html5-qrcode Html5Qrcode`, rear camera, 10fps, 250px qrbox, 2.5s cooldown). Recent hand list.
- Shell: `App.jsx` masthead nav (`ScanIn / Door ledger`), `index.css` ledger theme, `api.js` axios base `VITE_API_URL`.

### 5.5 Infra / Config
- `backend/server.js` - express, cors `FRONTEND_URL`, `mongoose.connect(MONGO_URI)`.
- DNS workaround (ISP blocks SRV): `dns.setServers(['8.8.8.8','8.8.4.4'])` before connect in `server.js:5-6`. If still `querySrv ECONNREFUSED`, set OS DNS to 8.8.8.8 + resume Atlas cluster + whitelist IP.
- `backend/.env`: `PORT=5000, MONGO_URI=mongodb+srv://.../qrcheckin?..., JWT_SECRET, FRONTEND_URL=http://localhost:5173`
- OTP mail: `SMTP_HOST/PORT/USER/PASS/FROM` (Gmail app password, not login password). Without SMTP, OTP is logged server-side; set `ALLOW_OTP_DEBUG=true` locally to also return it in the API response (never in production).
- `frontend/.env`: `VITE_API_URL=http://localhost:5000`
- DB: Mongo Atlas `qrcheckin` db. Collections auto: users, events, tickets.

## 6. DB Schema (Mongoose)
```js
User: { name, email unique, passwordHash, role: 'admin'|'staff', timestamps }
Event: { title, description, venue, date: Date, isActive: Bool default true, createdBy: ObjectId(User) }
Ticket: { eventId: ObjectId(Event) indexed, attendeeName, attendeeEmail, mobileNo required, age required 5-120, code unique indexed, isUsed default false, usedAt, checkedInBy: ObjectId(User) }
Otp: { eventId, attendeeName, attendeeEmail, mobileNo, age, code 6-digit, attempts default 0, lastSentAt, expiresAt (TTL auto-delete) }
```

Indexes: Ticket.code unique, Ticket(eventId + attendeeEmail) unique (one ticket per email per event), Otp(eventId + attendeeEmail) unique, Otp.expiresAt TTL.

## 7. UI / UX — Cream + ink + yellow v5 (current)
Adapted from login screenshot ref (not copied). One `src/index.css`, Space Grotesk headings + Inter body via Google Fonts.
- Tokens: cream `#f6f1e5` bg, ink `#191817` 2px borders, yellow `#ffd23f` pill buttons with hard offset shadow + press effect, purple `#b79cf7` badges, red-orange `#e8552f` logo/links
- Header: cream bar, 2px ink rule, red circle S logo
- Login matches ref: purple STAFF ONLY pill, big heading, bordered card, uppercase labels, yellow block button, dashed divider, red account link
- Cards/tables/forms/scanner inherit the same bordered language; stat numbers and headings in Space Grotesk
- Deps unchanged: `axios, react-router-dom, qrcode.react, html5-qrcode`

## 8. Non-Functional
- Checkin <300ms single query+save
- Camera needs HTTPS or localhost + permission; manual fallback always works
- Atlas free tier (<10k tickets), 10s stats polling
- `npm run build` must pass (vite). Current bundle ~580kB (html5-qrcode) — acceptable for MVP, code-split later.

## 9. Milestones
- [x] Backend auth + events + tickets API
- [x] Dashboard + public register + QR stub
- [x] Manual + camera scan + 10s stats
- [x] DNS workaround + Atlas `qrcheckin` connect
- [x] UI rebuilds, verified registration, event teams, split pages, live dashboard
- [x] Deploy prep: `frontend/vercel.json` SPA rewrites, README env guide
- [ ] Deploy live: Render (root `backend`) + Vercel (root `frontend`) + Atlas
- [ ] README screenshots + demo video

## 10. Demo Script
1. Dashboard → Record `HackNight 2026`
2. Incognito → invitation slip → register → boarding-pass stub
3. Ledger → roll shows Waiting → Door → camera/type code → Stamped → rescan → Seen-before
4. Count 1/total, % bar moves
Line: "unique crypto codes, JWT RBAC, duplicate-scan guard, live ledger."

## 11. Resume Bullet
"Built ScanIn, QR event check-in system (MERN) with public invite slips, crypto QR stubs, camera + manual gate terminal with duplicate-stamp guard, and live ledger dashboard."

## 12. Future Scope
- CSV export, email ticket, bulk import, offline queue, analytics graph, multi-session events, code-split scanner chunk

## 13. Changelog (update on every change)
- v1.0 — Initial: auth, events, tickets CRUD, manual checkin, plain CSS
- v1.1 — Moved `Default Project` → `D:\major_projects\ScanIn`; renamed to ScanIn; fixed `events.js` dead public route; added `frontend/.env.example`
- v1.2 — Atlas connect: `MONGO_URI .../qrcheckin`, added `dns.setServers 8.8.8.8` in `server.js` for `querySrv ECONNREFUSED`; camera scan in `Scan.jsx` via `Html5Qrcode` (rear, 10fps, 250px, 2.5s cooldown, URL-tolerant codes)
- v1.3 — Ledger UI v2: `index.css` paper/stamp/ticket theme, `App.jsx` masthead, Dashboard/EventDetail/Login/PublicRegister/MyTicket/Scan copy restyle, build verified
- v1.4 — Zentra-style UI v3 per Dribbble ref (REVERTED per feedback, files restored to v1.3 ledger theme, build verified)
- v1.5 — Design-system SaaS UI v4 per landing-page ref (adapted, not copied): shadcn tokens, sticky blur header, badge hero, stat cards, primary/outline/ghost buttons, all pages restyled, build verified
- v1.6 — Header/nav fix: Get started hidden when logged in (Sign in + Get started only logged out); How it works now anchors to new `#how-it-works` 3-step section on Dashboard instead of `/login`; Docs points to same section; scroll-margin for sticky header
- v1.7 — Verified registration: required name/email/mobile/age + 6-digit email OTP (request/verify routes, `Otp` model with TTL, 60s resend cooldown, 5-try limit, one ticket per email per event); `nodemailer` SMTP via env + dev fallback; roll table + walk-in form show Mobile/Age columns; search covers mobile
- v1.7 fix — SMTP was missing from real `.env` so no mail sent: added Gmail SMTP (app password) + `ALLOW_OTP_DEBUG=false`; live send test returns SENT; UI shows dev code only when SMTP unconfigured
- v1.8 — Event teams: `members` + `pendingInvites` on Event, owner/coordinator/volunteer roles, invite/remove/leave routes, pending auto-join on register, team section on EventDetail, ticket routes gated by team membership, event list scoped to my events
- v1.9 — Full-width layout: container 1100→1440px, events grid 3-col (2/1 on smaller), Team + Walk-in side-by-side via `.grid-main`, scanner form + recent side-by-side via `.scan-layout`
- v2.0 — Cream/ink/yellow UI v5 per login screenshot ref (adapted): cream bg, 2px ink borders, yellow pill buttons with press shadow, purple badges, red logo/links, Space Grotesk + Inter, Login rebuilt to match ref, all pages inherit, build verified
- v2.1 — Page split: new `/events/new` create page and `/how-it-works` guide page; Dashboard slimmed to hero + stats + grid; header nav Events/How-it-works
- v2.2 — Post-auth landing per screenshot: dark NOW LIVE card + 4 color tiles (adds real `checkedToday` to event list API) + upcoming cards with category pills/sold bar; header nav Events/Team/Tickets (team/tickets jump to first event's `#team`/`#tickets`), ORGANIZER/STAFF label from token, new-event icon button; `category` field on Event + picker on create
- v2.3 — Spacing fix: `.grid-main` carries its own bottom margin so Team/Walk-in row no longer touches the Tickets card (cards keep zero inner margin on desktop, normal stack on mobile)
- v2.4 — Removed RSVP/Free-entry special case on upcoming cards; zero-ticket events show 0% sold + On sale like everything else
- v2.5 — Deploy prep: `frontend/vercel.json` SPA rewrites, README Render/Vercel env guide; code pushed
