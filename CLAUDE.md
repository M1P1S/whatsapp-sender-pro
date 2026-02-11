# CLAUDE.md - AI Assistant Guide for WhatsApp Sender PRO

## Project Overview

WhatsApp Sender PRO is a Node.js/Express monolithic application for bulk WhatsApp messaging with a tiered subscription model (FREE/PRO). It targets the Brazilian market (Portuguese-language UI) and monetizes via Asaas payment integration.

**Key features**: Bulk WhatsApp messaging, JWT + session auth, single-session enforcement, subscription tiers (FREE: 50 msgs/day text-only, PRO: 500 msgs/day with media/scheduling), payment via Asaas PIX, PDF/CSV reporting, video processing via FFmpeg.

## Tech Stack

- **Runtime**: Node.js with Express 4.x
- **Database**: SQLite3 (file-based, `./server/whatsapp.db`)
- **Auth**: JWT (jsonwebtoken) + bcryptjs + express-session (SQLite-backed)
- **WhatsApp**: whatsapp-web.js (Puppeteer-based browser automation)
- **Payments**: Asaas API (Brazilian processor, PIX + credit card)
- **Media**: fluent-ffmpeg for video conversion, multer for uploads
- **Frontend**: Vanilla HTML/CSS/JS (no framework), served as static files
- **Module system**: CommonJS (`require`/`module.exports`)

## Repository Structure

```
server/
  index.js          # Main Express app - all routes, middleware (1500+ lines)
  database.js       # SQLite wrapper - all DB operations
  whatsapp-simple.js # WhatsApp Web.js client wrapper
  payment.js        # Asaas payment service (high-level)
  asaas-service.js  # Asaas API client (low-level)
  video-processor.js # FFmpeg video conversion pipeline
  uploads/          # Temporary media/contact file storage

public/
  index.html        # Main messaging interface
  auth.html         # Login/registration page
  dashboard.html    # User dashboard
  upgrade.html      # Subscription upgrade page
  app-auth.js       # Primary frontend app logic
  app.js            # Alternative app file
  session-checker.js # Client-side session polling
  style.css         # Global styles
  js/               # JS utilities

scripts/
  optimize-database.js  # DB index creation
  cleanup-final.js      # Pre-deployment cleanup
  migrate-sessions.js   # Session table migration

# Root utilities
create-admin.js     # Create admin user
create-admins.js    # Bulk admin creation
migrate.js          # Create active_sessions table
prepare-deploy.js   # Interactive deployment wizard
fix-bugs.sh         # Deployment/fix script (PM2-based)
```

## Commands

### Development
```bash
npm run dev          # Start with nodemon (watches server/, auto-reload)
npm run start        # Production start (512MB heap, GC exposed)
```

### Utility Scripts
```bash
node create-admin.js              # Create an admin user
node migrate.js                   # Create active_sessions table
node scripts/optimize-database.js # Add DB indexes for performance
node prepare-deploy.js            # Interactive deployment setup
```

### No Testing or Linting
There are no test suites, test runners, linters, or formatters configured. There is no `npm test` command. No ESLint, Prettier, or pre-commit hooks exist.

## Architecture & Key Patterns

### Server Entry Point
`server/index.js` is the monolithic entry point containing all Express middleware and route handlers. The middleware stack order:
1. CSP security headers
2. Rate limiter (global + per-auth)
3. CORS
4. Compression
5. JSON/cookie parsers
6. Session store (SQLite)
7. Static file serving (`public/`)
8. Route handlers

### Authentication Flow
- JWT tokens issued on login, verified via `authenticateToken` middleware
- Single-session enforcement: only one active session per user at a time
- `active_sessions` table tracks tokens; old sessions invalidated on new login
- Cleanup job runs every hour to remove stale sessions
- Client polls `/api/auth/session-status` every 30 seconds

### Database Schema (SQLite)
- **users**: id, email (unique), password (hashed), name, plan, created_at, plan_expires_at
- **sends**: id, user_id, date, count (daily message counter)
- **history**: id, user_id, contacts_count, success_count, failed_count, has_media, created_at, contacts
- **schedules**: id, user_id, contacts (JSON), message, media_path, media_type, scheduled_date, status, created_at, executed_at
- **active_sessions**: id, user_id, session_token (unique), device_info, ip_address, created_at, last_activity, is_active

### Subscription Feature Gates
Routes check `req.user.plan` to gate PRO features:
- Media uploads (images, videos)
- Message scheduling
- Detailed reports
- Duplicate contact filtering

### API Routes

**Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session-status`, `GET /api/auth/me`, `POST /api/auth/logout`

**WhatsApp**: `GET /api/qrcode`, `GET /api/status`, `POST /api/disconnect`, `POST /api/send`, `POST /api/upload-contacts`, `POST /api/test-number`

**Plans**: `GET /api/plan/info`, `POST /api/plan/upgrade`

**Payment**: `POST /api/payment/create-pix`, `POST /api/payment/webhook`, `GET /api/payment/status/:paymentId`, `GET /api/user/premium-status`

**History/Reports**: `GET /api/history`, `GET /api/reports/pdf`, `GET /api/reports/csv`

**Scheduling** (PRO): `POST /api/schedule`, `GET /api/schedules`, `DELETE /api/schedule/:id`

**Health**: `GET /api/health`

## Code Conventions

- **Language**: All UI text, comments, and variable naming context are in Portuguese (Brazilian)
- **Error handling**: try/catch in async route handlers, generic JSON error responses
- **SQL**: Parameterized queries via SQLite3 API (safe from injection)
- **Logging**: `console.log` / `console.error` throughout (no logging framework)
- **Comments**: Emoji-based section markers common in source (e.g., `// 🚀`, `// ✅`)
- **No TypeScript**: All code is plain JavaScript
- **No classes**: Functional module pattern with exported functions/objects
- **Phone format**: Brazilian numbers auto-formatted as `55 + DDD + number`
- **Message delays**: 2-4 second delay between WhatsApp messages (anti-ban)

## Environment Variables

Defined in `.env` (see `.env.example`):

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |
| `BASE_URL` | App base URL | `http://localhost:3000` |
| `JWT_SECRET` | Token signing secret | (must set) |
| `ASAAS_API_KEY` | Payment API key | (must set for payments) |
| `ASAAS_ENVIRONMENT` | `sandbox` or `production` | `sandbox` |
| `DB_PATH` | SQLite database path | `./server/database.db` |
| `ALLOWED_ORIGINS` | CORS origins | `http://localhost:3000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` |

## Deployment

- Process manager: PM2
- Reverse proxy: Nginx recommended
- HTTPS required in production (secure cookies)
- Run `node prepare-deploy.js` for interactive setup
- Run `node scripts/optimize-database.js` before production
- Create admin: `node create-admin.js`

## Important Notes for AI Assistants

1. **`server/index.js` is large** (~1500 lines). All routes live here. Read relevant sections before modifying.
2. **No tests exist**. When adding features, be extra careful with manual verification via `/api/health` and log inspection.
3. **No linter/formatter**. Match the existing code style (2-space indent, single quotes preferred, CommonJS modules).
4. **SQLite is the only DB**. All queries are synchronous-callback style wrapped in the `database.js` module. Use parameterized queries.
5. **WhatsApp session is stateful**. The `whatsapp-simple.js` module maintains a single client instance. Restarting the server requires re-scanning the QR code unless `wwebjs_auth/` persists.
6. **Frontend is vanilla JS**. No build step, no bundler. Edit HTML/CSS/JS files directly in `public/`.
7. **Payment webhooks** from Asaas must be validated. The webhook endpoint is `POST /api/payment/webhook`.
8. **Sensitive files**: Never commit `.env`, `server/whatsapp.db`, `wwebjs_auth/`, or `server/uploads/` contents.
