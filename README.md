# QR Event Check-in (MERN)

Simple QR ticketing + gate check-in for college events. See `PRD.md` for full requirements.

## Run locally

1. MongoDB - create free Atlas cluster, get URI
2. Backend:
```
cd backend
cp .env.example .env  # fill MONGO_URI + JWT_SECRET
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
- Backend -> Render (build: npm install, start: node server.js)
- Frontend -> Vercel (root: frontend, env VITE_API_URL=your-render-url)
- DB -> Mongo Atlas
