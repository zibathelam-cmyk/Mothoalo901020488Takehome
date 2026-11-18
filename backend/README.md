# BukaHub API

Express + PostgreSQL service for the BukaHub library desk.

```powershell
npm install
copy .env.example .env
npm start
```

Set `DATABASE_URL` to point at your PostgreSQL server, then start. On boot the service applies `src/init.sql`, seeds a circulation-desk administrator and a handful of starter books, and listens on `PORT` (default 5057).

See the root `README.md` for the full endpoint list and login details.
