# AGENTS.md

## Cursor Cloud specific instructions

**Product**: MyBarber — a barbershop/salon booking platform (Uzbekistan-focused). Monorepo with Django backend + 3 Vite/React frontends.

### Architecture at a glance

| Service | Port | Start command |
|---------|------|---------------|
| Django API (REST + WebSocket) | 8000 | `cd backend && source .venv/bin/activate && python manage.py runserver 0.0.0.0:8000` |
| User frontend | 3000 | `npm run dev:user` (from repo root) |
| Admin frontend | 3001 | `npm run dev:admin` (from repo root) |
| Barber frontend | 3002 | `npm run dev:barber` (from repo root) |

### Backend setup caveats

- The backend uses **SQLite** by default (no `DATABASE_URL` needed). The `.env` file should comment out `DATABASE_URL` for local dev.
- A `.env` file is required at `backend/.env`. Copy from `backend/.env.example`, set `DJANGO_SECRET_KEY` to any string, and comment out `DATABASE_URL`.
- Run `python manage.py migrate` before first start.
- The `create_admin_account` management command requires `--password` flag for non-interactive use: `python manage.py create_admin_account admin@example.com --password "YourPass123!"`
- Django Channels uses InMemoryChannelLayer when `REDIS_URL` is unset (default for local dev).

### Lint / test / build

- **Lint (frontend)**: `npm run lint -w user-web`, `npm run lint -w admin-web`, `npm run lint -w tanstack_start_ts`
- **Django checks**: `cd backend && source .venv/bin/activate && python manage.py check`
- **Build frontends**: `npm run build:frontends` (or individually: `build:user`, `build:admin`, `build:barber`)

### Auth systems

Three separate JWT auth systems — each has its own token endpoint:
- **User (customer)**: `POST /api/auth/token/` with `email` + `password`
- **Barber**: `POST /api/barber/auth/token/` with barber credentials
- **Admin**: `POST /api/admin/auth/token/` with `email` + `password`

### Node.js version

The frontend packages (TanStack Start/Router) require **Node.js >= 22.12.0**. The update script installs Node 22 via nodesource.
