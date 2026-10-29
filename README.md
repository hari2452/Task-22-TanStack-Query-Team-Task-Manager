# Task 22 — TaskFlow | TanStack Query Team Task Manager

Full-stack React + TypeScript, TanStack Query v5, Flask, JWT, MySQL project. Includes responsive dashboard, authentication, CRUD, role-based assignment, filters, debounced search, pagination, query caching, 10-second stats polling, optimistic detail status updates with rollback, hover prefetch, offline banner, loading skeletons and Devtools.

## 1. MySQL
Run `backend/schema.sql` in MySQL Workbench. Create your first user via Register. For an admin account, run `UPDATE users SET role='admin' WHERE email='your@email.com';` then log out and log in again.

## 2. Backend (PowerShell)
```
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```
Edit `.env` with your MySQL password and a strong JWT secret. Then run:
```
python app.py
```

## 3. Frontend (new terminal)
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Optional: set `VITE_API_URL=http://localhost:5000` in `frontend/.env`.

## Key TanStack Query patterns
- `useQuery` retrieves tasks, users, stats, and individual task details with cache keys including filters and pagination.
- `useMutation` creates, edits, deletes; `invalidateQueries` refreshes tasks/stats/details.
- `useStats` polls every 10 seconds; global `staleTime` is 60 seconds.
- `usePrefetchTask` fetches task details on row hover.
- Status updates optimistically modify the task detail cache and roll back if the request fails.
- `placeholderData` retains previous page results while loading the next page.
- Devtools (floating browser panel) shows cached queries.

## API routes
POST `/api/register`, POST `/api/login`, GET `/api/me`, GET `/api/logout` (client discards token), GET `/api/users` (admin), GET/POST `/api/tasks`, GET/PUT/DELETE `/api/tasks/:id`, GET `/api/stats`.

## Security and limitations
Passwords hashed with bcrypt. JWT required for protected routes. Members see only tasks they created or that are assigned to them; only creators/admins can delete. New users are members. Admin-only assignment to others. Frontend JWT uses localStorage as requested; for production, consider secure httpOnly cookies, HTTPS, CSRF protection, token revocation and refresh tokens. The example runs Flask debug mode for local development only. Offline banner uses in-memory query cache; refreshing the browser offline does not persist it. Pagination is numbered (not infinite scroll). Optimistic updates cover detail status edits; create/delete use invalidation. Error states and skeletons are included.

## Mentor write-up
**Why TanStack Query?** It replaces repeated useState/useEffect server-fetch boilerplate with caching, deduplication, loading/error flags and refetching.

**useQuery vs useMutation:** useQuery reads and caches server data; useMutation writes server data. Successful mutations invalidate relevant keys so active queries refetch.

**Query keys:** `['tasks', filters]` gives each filter/page combination a distinct cache entry; `['task', id]` identifies a single record.

**staleTime vs refetchInterval:** staleTime sets how long data is considered fresh. refetchInterval schedules repeated background fetching for active queries (10 seconds for stats).

**Optimistic updates:** Before a status mutation, cache is updated immediately; on error the old detail is restored; on success related queries are invalidated.

**Parallel queries:** Dashboard renders stats and task list concurrently; neither waits for the other.

**Dependent query:** Task details use `enabled: id > 0`; user list uses `enabled` only for admins.

## Day plan
Day 1: QueryClient/Provider, database, login and first queries. Day 2: mutations, filters, pagination and dashboard. Day 3: caching, prefetch, polling, skeletons, documentation and GitHub.
