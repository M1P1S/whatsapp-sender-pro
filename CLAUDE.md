# CLAUDE.md - WhatsApp Sender Pro

## Project Overview

WhatsApp Sender Pro is a bulk WhatsApp messaging platform with tiered subscription plans (FREE and PRO). It provides user authentication, WhatsApp Web integration, payment processing via Asaas (Brazilian payment provider), media support with FFmpeg, and scheduled messaging.

**Language:** Portuguese (BR) - comments, UI text, and variable names are predominantly in Portuguese.

## Tech Stack

- **Backend:** Node.js + Express.js 4.x
- **Database:** SQLite3 (file-based, `server/database.db`)
- **WhatsApp:** whatsapp-web.js (unofficial WhatsApp Web API via Puppeteer)
- **Auth:** JWT + bcryptjs + express-session with SQLite session store
- **Payments:** Asaas API (card + PIX)
- **Media:** FFmpeg via fluent-ffmpeg (video processing for WhatsApp compatibility)
- **Frontend:** Vanilla HTML/CSS/JS (no framework)

## Project Structure

```
server/
  index.js          # Main Express server - routes, middleware, startup (1500+ lines)
  database.js       # SQLite schema, migrations, and query functions
  whatsapp-simple.js # WhatsApp Web.js client wrapper
  payment.js        # Payment processing logic
  asaas-service.js  # Asaas payment API HTTP client
  video-processor.js # FFmpeg video validation and conversion
  uploads/          # User-uploaded media files (gitignored)

public/
  index.html        # WhatsApp message sending interface
  auth.html         # Login/registration page
  dashboard.html    # User dashboard
  upgrade.html      # PRO upgrade/pricing page
  app.js            # Sending interface frontend logic
  app-auth.js       # Authentication frontend logic
  session-checker.js # Single-session enforcement client
  style.css         # Shared styles (WhatsApp green + purple accent theme)
  js/
    session-checker.js # Session verification module

scripts/
  cleanup-final.js    # Database cleanup utility
  migrate-sessions.js # Session migration helper
  optimize-database.js # Create database indexes
```

## Commands

### Run Development Server
```bash
npm run dev
```
Uses nodemon with `--max-old-space-size=512 --expose-gc` flags. Watches `server/` directory for `.js` and `.json` changes.

### Run Production Server
```bash
npm start
```
Same memory flags, runs `server/index.js` directly.

### Utility Scripts
```bash
node create-admin.js        # Create admin user with PRO plan
node migrate.js             # Run database migrations
node scripts/optimize-database.js  # Add performance indexes
node prepare-deploy.js      # Interactive production deployment setup
```

### No Test Suite
There are no automated tests. No test framework is configured.

## Architecture

### API Endpoints (server/index.js)

| Group | Routes | Purpose |
|-------|--------|---------|
| Auth | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/session-status` | User authentication and session management |
| Plan | `/api/plan/info` | User plan details and message limits |
| Payment | `/api/payment/create-preference`, `/api/payment/create-pix`, `/api/payment/webhook`, `/api/payment/status/:paymentId` | Asaas payment processing |
| WhatsApp | `/api/qrcode`, `/api/status`, `/api/send` | QR code display, connection status, message sending |
| User | `/api/user/premium-status` | PRO status check |
| History | `/api/history`, `/api/export-history` | Message history and PDF export |
| Schedule | `/api/create-schedule`, `/api/schedules`, `/api/schedule/:id` | Scheduled message management |
| Health | `/api/health` | Server health check |

### Database Schema (server/database.js)

- **users** - Accounts with plan type (FREE/PRO) and expiration dates
- **sends** - Daily message count tracking per user (enforces plan limits)
- **history** - Message batch records with success/failure counts
- **schedules** - Scheduled messages (pending/executed/cancelled)
- **sessions** - Single-session enforcement (one active device per user)

### Plan Limits (hardcoded)

| Feature | FREE | PRO |
|---------|------|-----|
| Messages/day | 50 | 500 |
| Text messages | Yes | Yes |
| Image/video | No | Yes |
| Scheduling | No | Yes |

### Key Patterns

- **Authentication middleware:** JWT token verified on protected routes via `authenticateToken()` function
- **Single-session system:** Only one active session per user; new logins invalidate previous sessions
- **Database access:** Promise wrappers around sqlite3 callback API (see `database.js`)
- **Message sending:** 2-4 second delay between messages to avoid WhatsApp rate limiting
- **Video processing:** Videos validated and converted to MP4 H.264 (max 16MB) before sending

## Environment Variables

Required in `.env` (see `.env.example`):

```
PORT=3000
NODE_ENV=development|production
BASE_URL=http://localhost:3000
JWT_SECRET=<strong-random-string>
DB_PATH=./server/database.db
ASAAS_API_KEY=<asaas-api-token>
ASAAS_ENVIRONMENT=sandbox|production
ALLOWED_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
```

## Code Conventions

- **Language:** Portuguese for comments, logs, UI strings, and some variable names
- **Console logging:** Uses emoji prefixes for log categories (e.g., `[SINGLE-SESSION:API]` tags)
- **Async/await** throughout backend code
- **SQL injection prevention:** Parameterized queries with `?` placeholders — always maintain this pattern
- **Error handling:** Try-catch blocks with descriptive error messages returned as JSON `{ error: "message" }`
- **No TypeScript** — all plain JavaScript with CommonJS `require()` imports
- **No linter configured** — no ESLint or Prettier

## Known Issues

- `public/app.js` defines `API_URL` twice (lines 1 and 3)
- `server/index.js` is monolithic (1500+ lines) — routing and business logic are not separated
- CORS is configured with `origin: '*'` which is overly permissive
- Helmet security headers are partially disabled
- Several `.backup` files exist in `server/` directory
- Frontend stores JWT tokens in localStorage (XSS-vulnerable)

## Important Notes for AI Assistants

1. **Never commit `.env`, `*.db`, or `wwebjs_auth/` files** — these are gitignored for good reason
2. **Preserve Portuguese language** in comments, logs, and UI strings to maintain consistency
3. **Always use parameterized queries** for database operations — never interpolate user input into SQL
4. **The WhatsApp client requires Puppeteer/Chromium** — changes to whatsapp-simple.js may affect browser launch configuration
5. **Message delays are intentional** — the 2-4 second delays between sends prevent WhatsApp from flagging the account
6. **Memory is constrained to 512MB** — be mindful of memory usage in any new features
7. **No test suite exists** — manual verification is currently the only testing method
8. **SQLite is the only database** — all queries use SQLite syntax; no ORM is used
