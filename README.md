# BukaHub — Library Desk

A small community-library circulation system built for the Web Application Development lab test.

- **Frontend:** React (Vite, JSX, hooks, React Router, Fetch API)
- **Backend:** Express REST API
- **Database:** PostgreSQL (books, members and a stock-movement ledger)

## What it does

| Area | Features |
| --- | --- |
| Overview | Live catalogue totals, low-stock watchlist, recent movement timeline |
| Catalogue | Add / edit / delete books, search, genre filter, stock status |
| Stock movements | Receive copies or record a loan, with a full ledger |
| Members | Register, edit and remove members (admin only), role-based access |
| Sign in | Membership number + passphrase, session kept in `sessionStorage` |

A book is flagged **needs restocking** when its copies are below `LOW_STOCK_THRESHOLD` (default `2`).

## Project layout

```
backend/
  src/
    app.js               Express app, middleware and route mounting
    server.js            Database bootstrap and HTTP listener
    config.js            Environment configuration
    db.js                pg pool, SQL init, transaction helper
    init.sql             Tables and indexes
    security.js          scrypt passphrase hashing
    validation.js        Request validation helpers
    errors.js            HTTP errors and central error handler
    routes/              auth, books, users, transactions
frontend/
  src/
    api/client.js        Fetch wrapper (unwraps the API's `data` envelope)
    state/AppContext.jsx Session, toasts, threshold and refresh revision
    components/          App shell, nav, modal, fields, tiles, toasts
    pages/               SignIn, Overview, Catalogue, Movements, Members
    styles/              tokens, base, shell, pages
```

## Run it locally

### One-click start on this machine

Double-click **`start.bat`** in the project root. It opens two terminals (API + web server) and then opens the app in your browser. Close those two terminals to stop the servers.

| Service | Address |
| --- | --- |
| Frontend | http://localhost:5190 |
| API health check | http://localhost:5057/api/v1/health |
| PostgreSQL | `localhost:1231`, database `bukahub_db` |

The launcher uses the portable Node.js install at `C:\Users\DELL\AppData\Local\Programs\node-v26.13.1-win-x64` and falls back to `npm` on your PATH. PostgreSQL must be running (its Windows service is `postgresql-x64-18`).

### Manual setup / first-time setup

#### 1. PostgreSQL

Create a dedicated database (the app creates its own tables and seed rows on first start):

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -h localhost -p 1231 -U postgres -c "CREATE DATABASE bukahub_db;"
```

### 2. Backend

```powershell
cd backend
npm install
copy .env.example .env
```

Edit `.env` and replace `YOUR_PASSWORD` with your PostgreSQL password. Then:

```powershell
npm start
```

The API listens on **http://localhost:5057**.

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5190**. The Vite dev server proxies `/api` to port 5057.

## Desk account

| Field | Value |
| --- | --- |
| Membership number | `CIRC-7420` |
| Passphrase | `deskPass!26` |
| Role | admin |

A sample member account is also seeded: `MEM-1042` / `reader321`.

Change the seeded admin passphrase by setting `CIRCULATOR_PASSWORD` in `backend/.env` **before** the first start.

## API

All responses use `{ "data": ... }`; errors use `{ "error": { "message", "code" } }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/health` | Service check |
| GET | `/api/v1/meta` | Low-stock threshold |
| POST | `/api/v1/auth/signin` | Sign in |
| GET / POST | `/api/v1/books` | List / add books |
| GET / PATCH / DELETE | `/api/v1/books/:id` | Read / update / remove a book |
| GET / POST | `/api/v1/users` | List / register members |
| GET / PATCH / DELETE | `/api/v1/users/:id` | Read / update / remove a member |
| GET / POST | `/api/v1/transactions` | Ledger / record a movement |
| GET / PATCH / DELETE | `/api/v1/transactions/:id` | Read / edit the note / remove a movement (reverses its stock effect) |

Posting a movement with `direction: "IN"` or `"OUT"` updates `copies_on_hand` inside a database transaction, so stock cannot go negative.

## Visual direction

Warm paper canvas (`#f6f4ef`) with deep indigo (`#4b32b3`) and amber (`#d77d1d`) accents. Genres get their own colour chips (violet for Technology, plum for Cultural Studies, olive for History, amber for Business, rose for Poetry). Starter titles include *Motseng oa Lithaba*, *The Mountain Kingdom*, *Poems from the Maluti* and *Web Applications with React*.
