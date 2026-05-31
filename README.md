# Vijya Hospital — WhatsApp Appointment Automation

Production-ready WhatsApp Cloud API automation + admin panel for a hospital. Patients book / reschedule / cancel appointments entirely through WhatsApp; receptionists & admins manage everything from a React admin panel; long-term records live in Google Sheets while only **active** appointments occupy MongoDB.

## Architecture

```
vijya-hospital/
├── backend/                 # Node.js + Express + MongoDB API
│   ├── server.js
│   ├── models/              # Mongoose models
│   ├── routes/              # Express routes (admin REST + Meta webhook + flow endpoint)
│   ├── services/            # Domain services (metaCloud, chatbot, slots, sheets, redis, …)
│   ├── scripts/             # CLI helpers (flow:setup, reset:all, ngrok, seeds)
│   └── __tests__/           # Jest smoke tests
├── frontend/                # Vite + React + Tailwind admin panel
│   ├── src/pages/           # Dashboard, Appointments, Doctors, …
│   └── src/realtime.js      # SSE client (live updates without refresh)
└── .github/workflows/ci.yml # CI pipeline (test, build, audit)
```

### Patient flow (WhatsApp)

1. Patient sends *hi* → bot replies with image + **English / తెలుగు** buttons.
2. After language pick → bot sends *Choose Service* Flow CTA (image header).
3. Inside the multi-screen Flow:
   - **Book Appointment** → Department list → Doctors list → Form (name, age, gender, reason, slot) → Payment (Pay at Hospital / Online).
   - **My Appointments** → list → details (table-style screen).
   - **Reschedule Appointment** → pick → list of next 21-day slots → confirm.
   - **Cancel Appointment** → pick pending → confirm.
   - **Our Website** / **Contact Us** → handled outside the flow as a CTA-URL message.
4. After booking / reschedule / cancel the bot sends:
   - The appointment **PDF** (generated in-memory, uploaded to Meta media — *never stored* in Cloudinary).
   - A **Get Directions** CTA URL (Google Maps directions to hospital).

### Doctor postpone

Admin marks doctor absent for a date in the panel → backend automatically:

1. Records the absence on the doctor.
2. Finds the next free slot for the same doctor for each affected appointment.
3. Creates new appointments and marks the old ones `postponed` (purple/blue in Sheets).
4. Sends every affected patient a postpone notification + new PDF + directions CTA.

If no future slots are free, the appointment stays in `postponed` state without a replacement and the patient is informed.

### Admin lifecycle

- **Mark Arrived** → patient gets WhatsApp confirmation.
- **Complete Consultation** → patient gets thank-you + appointment moves from MongoDB to **Completed** Sheet.
- **Mark Paid** → updates `paymentStatus` (used for *pay at hospital* mode after the receptionist collects cash).

### Google Sheets layout

Four tabs:

| Tab | Status | Row colour |
|-----|--------|------------|
| Today Appointments | `booked` / `arrived` (today) | yellow |
| Upcoming Appointments | `booked` / `arrived` (future) | yellow |
| Completed | `completed` | green |
| Cancelled | `cancelled` (red), `rescheduled` (purple), `postponed` (blue) | per status |

Header is bold + frozen, columns auto-resize. Active appointments appear in `Today` / `Upcoming`; once moved to `completed` / `cancelled` they are removed from MongoDB.

### Redis

`backend/services/redis.js` is fully duck-typed: when `REDIS_URL` (or `REDIS_HOST`) is configured, it uses ioredis; otherwise a Map-based fallback with TTL keeps everything working on a fresh laptop. It powers:

- 15-second cache on `/api/dashboard/stats`
- Booking-token store (form-submit → payment-confirm round-trip)
- Cross-process pub/sub for SSE realtime (`vh:events:*`)

### Realtime admin updates

Backend emits domain events on `appointments`, `doctors`, `departments`, `holidays`, `settings`, `flow-images`. Admin pages subscribe via `frontend/src/realtime.js` (EventSource → `GET /api/realtime/stream`) and refresh themselves with no manual page reload.

---

## Quick start (local dev)

### 1. Install

```pwsh
cd vijya-hospital/backend
npm install
cd ../frontend
npm install
```

### 2. Reset existing shared resources

The Mongo cluster, Cloudinary cloud and Google Sheet you provided are already used by other projects. To wipe **only the Vijya Hospital data** (the script confirms which DB / folder / tabs it touches before doing anything):

```pwsh
cd vijya-hospital/backend
npm run reset:all -- --yes
```

This:

- Drops the `vijya_hospital` Mongo database (other DBs on the cluster like `kavitha_pg` are untouched).
- Deletes every Cloudinary asset under the `vijya_hospital/` folder (other projects safe).
- Clears every row of the four sheet tabs the project owns (`Today Appointments`, `Upcoming Appointments`, `Completed`, `Cancelled`).

### 3. Seed admin + departments

```pwsh
npm run seed:admin
npm run seed:departments
```

Default login: `admin` / `admin@123`.

### 4. Start the API + admin panel

In two terminals:

```pwsh
# Terminal 1 — API
cd vijya-hospital/backend
npm run dev          # runs on :5050

# Terminal 2 — Admin
cd vijya-hospital/frontend
npm run dev          # runs on :5173
```

### 5. Expose backend over HTTPS via ngrok

Get a free authtoken at https://dashboard.ngrok.com and put it in `backend/.env`:

```
NGROK_AUTHTOKEN=xxxxxxxxxxxxxxxxxxxxxxxxx
```

Then in a third terminal:

```pwsh
cd vijya-hospital/backend
npm run ngrok
```

The script:

- Opens an HTTPS tunnel to your local backend.
- Writes the public URL into `BACKEND_URL` in `.env`.
- Prints **the exact URLs you must paste into Meta dashboard**:

```
Webhook callback URL:  https://<your-ngrok-id>.ngrok-free.app/api/webhook/meta
Verify token:          vijya_hospital_verify
Flow endpoint URI:     https://<your-ngrok-id>.ngrok-free.app/api/flow-endpoint
```

### 6. Create the WhatsApp Flow on Meta

Note: the user requested **a brand-new flow** — existing flows in the WABA are untouched.

```pwsh
cd vijya-hospital/backend
npm run flow:setup
```

This:

1. Generates an RSA-2048 keypair (`flow_keys/`).
2. Uploads the public key to the Meta phone-number `whatsapp_business_encryption` endpoint.
3. **Creates a NEW flow** named *"Vijya Hospital Welcome"* on your WABA, points its endpoint to `BACKEND_URL/api/flow-endpoint`, uploads the multi-screen Flow JSON, and **publishes** it.
4. Saves `WHATSAPP_FLOW_ID` and `WHATSAPP_FLOW_STATUS=PUBLISHED` to `.env`.

Re-running this creates additional flows. To just refresh the JSON of an existing flow:

```pwsh
npm run flow:sync
```

### 7. Wire the webhook in Meta

1. Go to https://business.facebook.com/wa/manage → WhatsApp Manager → API Setup.
2. **Webhook → Edit**:
   - Callback URL: paste the one printed by `npm run ngrok` (`…/api/webhook/meta`).
   - Verify token: `vijya_hospital_verify` (matches `META_VERIFY_TOKEN`).
3. Subscribe to webhook fields: `messages` (and optionally `message_template_status_update`).

You're ready. Send `hi` from any WhatsApp number to your business phone.

---

## Production

- Set `NODE_ENV=production` and `BACKEND_URL=https://your-domain.com`.
- Provide `REDIS_URL` (Upstash works) for cross-process pub/sub.
- Deploy the backend (Render / Railway / Fly / EC2). Run `npm run flow:setup` once after deploy with the production `BACKEND_URL`.
- Deploy the frontend (Vercel / Netlify) with `VITE_API_URL=https://your-domain.com/api`.
- Add a private health check on `/api/health`.

---

## CI / CD

`.github/workflows/ci.yml` runs on every push / PR:

- **backend-test** — installs, boots Redis service, runs Jest smoke suite (`__tests__/smoke.test.js`).
- **frontend-build** — Vite production build.
- **security-audit** — `npm audit --audit-level=high` for both apps.
- **deploy-notify** — placeholder; wire your provider's deploy action there.

To add Mongo-backed integration tests, add a `mongo` service to `backend-test` (the file already shows the pattern from the Restarunt reference).

---

## Reset / re-seed cheatsheet

```pwsh
npm run reset:all -- --yes      # wipe everything Vijya Hospital owns
npm run seed:admin              # default admin user
npm run seed:departments        # 6 starter departments
npm run flow:setup              # only if recreating the flow
```

---

## Key files

| File | Purpose |
|------|---------|
| `backend/services/chatbot.js` | All outbound WhatsApp messages (lang choice, choose-service, PDFs, lifecycle) |
| `backend/services/flowJson.js` | Multi-screen Flow JSON (10 screens) |
| `backend/routes/flowEndpoint.js` | Encrypted Flow endpoint — produces every dynamic screen |
| `backend/routes/webhook.js` | Meta webhook receiver, dispatches `nfm_reply` complete actions |
| `backend/services/appointmentService.js` | Booking, reschedule, cancel, postpone, sheet sync |
| `backend/services/googleSheets.js` | Color-coded multi-tab Sheets sync |
| `backend/services/pdfGen.js` | In-memory PDF generation (no Cloudinary storage) |
| `backend/services/redis.js` | Redis with in-memory fallback + pub/sub |
| `backend/services/realtime.js` | SSE hub for live admin updates |
| `frontend/src/realtime.js` | SSE client used by every admin page |
| `frontend/src/pages/AppointmentDetails.jsx` | Table-style appointment screen + Print PDF |

---

## Credits

Patterns adapted from the Kavitha PG, Himalayan Yoga and Restaurant reference projects in this monorepo.
