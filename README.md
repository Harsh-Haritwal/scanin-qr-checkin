# ScanIn — QR event check-in (MERN)

QR ticketing + gate check-in for college events. See `PRD.md` for full requirements.

## Run locally

1. MongoDB - create free Atlas cluster, get URI
2. Backend:
```
cd backend
copy .env.example .env  # fill values (Windows: copy, Mac/Linux: cp)
npm install
npm run dev
```
3. Frontend:
```
cd frontend
npm install
npm run dev
```
Frontend runs on :5173, backend on :5000. Set `VITE_API_URL=http://localhost:5000` in frontend/.env

## Manual test
- Register admin -> login -> create event -> copy public link
- Open public link in incognito -> register -> get QR code page
- Login as staff -> /scan/:eventId -> enter code -> SUCCESS -> scan again -> ALREADY_USED

## Deploy
- DB: Mongo Atlas (Network Access must allow the backend — `0.0.0.0/0` for dev)
- Backend → Render.com → New Web Service → repo `scanin-qr-checkin`:
  - Root Directory: `backend`, Build Command: `npm install`, Start Command: `npm start`
  - Env vars: `MONGO_URI`, `JWT_SECRET` (long random string), `FRONTEND_URL` (your Vercel URL),
    `SMTP_HOST/PORT/USER/PASS/FROM`, `ALLOW_OTP_DEBUG=false`
- Frontend → Vercel → Import repo → Root Directory: `frontend`:
  - Env var: `VITE_API_URL=https://YOUR-BACKEND.onrender.com`
  - `vercel.json` already handles SPA rewrites so `/events/:id` links work on refresh
- After both are up: set Render `FRONTEND_URL` to the Vercel URL and redeploy backend (CORS)

Note: Render free tier sleeps after inactivity — first request can take ~50s to wake.
