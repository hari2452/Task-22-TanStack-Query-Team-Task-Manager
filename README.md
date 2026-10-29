# Task 22 – TanStack Query Team Task Manager

## TaskFlow – Full-Stack Task Management Application

TaskFlow is a full-stack team task management application developed using **React, TypeScript, TanStack Query, Flask, JWT Authentication, and MySQL**.

The application helps users create, assign, update, track, and manage tasks through a responsive dashboard.

The main objective of Task 22 is to understand **server-state management using TanStack Query**, including data fetching, caching, mutations, cache invalidation, pagination, background refetching, optimistic updates, and rollback handling.

---

## 1. Project Overview

**Project Name:** TaskFlow – Team Task Manager
**Task Number:** 22
**Project Type:** Full-Stack Web Application
**Frontend:** React + TypeScript + Vite
**Backend:** Python Flask
**Database:** MySQL
**Authentication:** JWT
**State Management:** TanStack Query
**UI:** CSS3 + Lucide React Icons

### Project Objective

The main objectives are to:

* Build a full-stack team task management application.
* Integrate React with Flask REST APIs.
* Manage server-side data using TanStack Query.
* Implement task creation, editing, deletion, and assignment.
* Provide search, filtering, and pagination.
* Implement authentication and role-based access.
* Automatically synchronize data using cache invalidation.
* Implement optimistic updates and rollback handling.
* Display dashboard statistics with background refetching.
* Build a responsive, professional user interface.

---

## 2. Technologies Used

### Frontend

| Technology     | Purpose                        |
| -------------- | ------------------------------ |
| React          | Component-based user interface |
| TypeScript     | Type safety                    |
| Vite           | Frontend development and build |
| TanStack Query | Server-state management        |
| Axios          | HTTP API communication         |
| React Router   | Client-side navigation         |
| Lucide React   | UI icons                       |
| CSS3           | Styling and responsive design  |

### Backend

| Technology | Purpose                        |
| ---------- | ------------------------------ |
| Python     | Backend programming            |
| Flask      | REST API development           |
| MySQL      | Database                       |
| JWT        | Authentication                 |
| Flask-CORS | Cross-origin API communication |
| Bcrypt     | Password hashing               |

---

## 3. Application Features

### User Authentication

* User registration
* User login
* JWT-based authentication
* Protected application routes
* User information retrieval
* Role-based permissions
* Logout functionality

### Task Management

* Create tasks
* View tasks
* Edit tasks
* Delete tasks
* Assign tasks to users
* Update task status
* Set task priority
* Add task descriptions
* Set task due dates
* View individual task details

### Task Status

The application supports:

1. To Do
2. In Progress
3. Done

### Task Priority

The application supports:

1. Low
2. Medium
3. High

### Search and Filtering

Users can:

* Search tasks by title.
* Filter tasks by status.
* Filter tasks by priority.
* Filter tasks by assigned user where permitted.
* Navigate through paginated task results.

### Dashboard

The dashboard displays:

* Total Tasks
* To Do Tasks
* In Progress Tasks
* Completed Tasks
* Overdue Tasks
* Tasks Completed This Week
* Team Progress Percentage
* Recent Tasks

---

# 4. TanStack Query Implementation

TanStack Query is the primary concept demonstrated in Task 22.

It manages asynchronous server data and provides built-in functionality for caching, refetching, loading states, errors, and mutations.

## 4.1 QueryClient Configuration

The application configures TanStack Query in:

`frontend/src/main.tsx`

```tsx
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
});
```

### Configuration Explanation

| Property             | Description                                      |
| -------------------- | ------------------------------------------------ |
| staleTime            | Data remains fresh for 60 seconds                |
| gcTime               | Inactive queries remain cached for 5 minutes     |
| retry                | Failed queries retry once                        |
| refetchOnWindowFocus | Refetch stale data when returning to the browser |
| refetchOnMount       | Refetch stale data when a query mounts           |
| refetchOnReconnect   | Refetch stale data after reconnecting            |

These settings improve data consistency and reduce unnecessary API requests.

---

## 4.2 Fetching Tasks Using useQuery

Task data is fetched through a custom hook.

File:

`frontend/src/hooks/useTasks.ts`

```tsx
export const useTasks = (filters: TaskFilters) =>
  useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
    placeholderData: (previous) => previous,
  });
```

### Explanation

* `queryKey` uniquely identifies the query.
* `queryFn` fetches data from the Flask backend.
* `placeholderData` keeps previously displayed data visible while a new page or filter result loads.

### Benefits

* Automatic caching
* Loading state management
* Error handling
* Background refetching
* Reduced manual state management

---

## 4.3 Query Keys

The application uses the following query keys:

```tsx
["stats"]

["tasks", filters]

["task", id]

["users"]
```

### Explanation

Each query key identifies a separate cached resource.

For example:

```tsx
["tasks", { page: 1, limit: 10 }]
```

and

```tsx
["tasks", { page: 2, limit: 10 }]
```

represent different task-list queries.

This allows TanStack Query to cache pagination results separately.

---

## 4.4 Creating Tasks Using useMutation

Task creation is implemented using `useMutation`.

```tsx
const add = useMutation({
  mutationFn: createTask,

  onSuccess: async () => {
    await refreshQueries();
  },
});
```

### Explanation

`useMutation` is used for operations that modify server data.

Examples include:

* POST requests
* PUT requests
* DELETE requests

After creating a task, the application invalidates relevant cached queries.

---

## 4.5 Cache Invalidation

The application uses `invalidateQueries()` to synchronize the UI after task changes.

```tsx
const refreshQueries = async () => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["tasks"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["stats"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["task"],
    }),
  ]);
};
```

### Explanation

When a task is created, updated, or deleted:

1. The backend processes the request.
2. Related cached queries are invalidated.
3. Active matching queries are refetched.
4. The UI displays updated server data.

This eliminates the need to manually refresh the browser.

---

## 4.6 Optimistic Updates

Optimistic updates improve responsiveness by updating cached data before the server confirms the request.

```tsx
onMutate: async ({ id, data }) => {
  await queryClient.cancelQueries({
    queryKey: ["task", id],
  });

  const previousTask = queryClient.getQueryData<Task>([
    "task",
    id,
  ]);

  if (previousTask) {
    queryClient.setQueryData<Task>(
      ["task", id],
      {
        ...previousTask,
        ...data,
      }
    );
  }

  return {
    previousTask,
    id,
  };
};
```

### Explanation

1. The user updates a task.
2. TanStack Query cancels an ongoing task-detail fetch.
3. The previous task data is saved.
4. The cached task detail is updated immediately.
5. The API request runs.
6. The cache is synchronized after the request settles.

The optimistic update targets the individual task-detail cache.

---

## 4.7 Rollback Handling

If the update request fails, the application restores the previous cached task.

```tsx
onError: (error, _variables, context) => {
  if (context?.previousTask) {
    queryClient.setQueryData(
      ["task", context.id],
      context.previousTask
    );
  }

  console.error("Failed to update task:", error);
};
```

### Explanation

Rollback prevents failed updates from remaining visible in cached task details.

### Flow

```text
User Updates Task
       |
       v
onMutate()
       |
       v
Save Previous Cache
       |
       v
Update Cached Task
       |
       v
Send API Request
       |
       v
   API Response
    /       \
Success    Failure
   |          |
   v          v
Refresh    Rollback
Queries    Old Cache
```

---

## 4.8 Automatic Background Refetching

Dashboard statistics use automatic background refetching.

```tsx
export const useStats = () =>
  useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 10000,
  });
```

### Explanation

The statistics query refetches every 10 seconds while active in the foreground.

This helps keep dashboard information updated.

Background-tab polling is not enabled by default.

---

## 4.9 Parallel Queries

The dashboard fetches statistics and recent tasks through independent queries.

```tsx
const statsQuery = useStats();

const tasksQuery = useTasks({
  page: 1,
  limit: 5,
});
```

### Explanation

Both queries can execute independently.

The task query does not need to wait for the statistics query.

This improves application responsiveness.

---

## 4.10 Dependent and Conditional Queries

The application enables the user-list query only for administrators.

```tsx
export const useUsers = (enabled: boolean) =>
  useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled,
  });
```

Usage:

```tsx
const users = useUsers(user?.role === "admin");
```

### Explanation

The `enabled` option controls whether the query executes.

This prevents unnecessary requests to admin-only endpoints.

---

## 4.11 Debounced Search

The application uses a custom debounce hook.

```tsx
const debouncedSearch = useDebounce(filters.search);

const effectiveFilters = {
  ...filters,
  search: debouncedSearch,
};
```

### Explanation

Debouncing delays the search query until the user pauses typing.

This reduces unnecessary API requests and improves performance.

---

## 4.12 Pagination

Task pagination is handled through query parameters.

Example:

```text
GET /api/tasks?page=1&limit=10
```

The backend returns a response containing:

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 10
}
```

TanStack Query caches results based on the current filter and pagination parameters.

---

## 4.13 Loading Skeletons

The application displays skeleton placeholders while task data loads.

```tsx
{isPending ? (
  <div className="skeletonwrap">
    {[1, 2, 3, 4].map((item) => (
      <div className="skeleton" key={item} />
    ))}
  </div>
) : (
  <TaskList />
)}
```

Loading skeletons provide visual feedback during API requests.

---

## 4.14 Error Handling

The application handles API errors through TanStack Query states.

```tsx
const {
  isPending,
  isError,
  error,
  refetch,
} = useTasks(filters);
```

### Error Handling Features

* Loading indicators
* API error messages
* Retry buttons
* Mutation error logging
* Rollback on failed optimistic updates

---

## 4.15 Offline Indicator

The application displays an offline notification when browser connectivity is unavailable.

Previously cached task data may remain visible.

The application does not currently implement persistent offline storage or a guaranteed offline mutation queue.

---

## 4.16 React Query Devtools

The application integrates React Query Devtools.

```tsx
<ReactQueryDevtools initialIsOpen={false} />
```

### Devtools Features

* Inspect query keys
* View cached API responses
* Check query status
* Monitor background refetching
* Inspect query observers
* Debug mutations

Devtools was used to inspect the application's task and statistics queries.

---

# 5. Project Structure

```text
task-manager-rq/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── schema.sql
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── axios.ts
│   │   │   └── tasks.ts
│   │   │
│   │   ├── components/
│   │   │   ├── FilterBar.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── StatsPanel.tsx
│   │   │   ├── TaskCard.tsx
│   │   │   └── TaskForm.tsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useTaskMutations.ts
│   │   │   └── useTasks.ts
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── TaskDetail.tsx
│   │   │   └── TasksPage.tsx
│   │   │
│   │   ├── types/
│   │   │
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── style.css
│   │   └── vite-env.d.ts
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

The `.env` file is used locally and must not be committed to GitHub.

---

# 6. Installation and Setup

## Prerequisites

Install the following:

* Python 3
* Node.js and npm
* MySQL Server
* Git
* VS Code

## Step 1: Clone Repository

```bash
git clone https://github.com/hari2452/Task-22-TanStack-Query-Team-Task-Manager.git
```

```bash
cd Task-22-TanStack-Query-Team-Task-Manager
```

## Step 2: MySQL Database Setup

Create a database:

```sql
CREATE DATABASE IF NOT EXISTS task_manager;
```

Import the database schema:

```bash
mysql -u root -p task_manager < backend/schema.sql
```

The database contains tables for:

* Users
* Tasks

## Step 3: Backend Setup

Navigate to the backend folder:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### Environment Configuration

Create a `.env` file inside the backend directory.

Configure the MySQL connection details and JWT secret using the variable names expected by `backend/app.py`.

Do not commit real credentials.

### Run Backend

```bash
python app.py
```

Backend URL:

```text
http://127.0.0.1:5000
```

Health endpoint:

```text
http://127.0.0.1:5000/api/health
```

## Step 4: Frontend Setup

Open another terminal.

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

# 7. REST API Endpoints

## Authentication

| Method | Endpoint        | Description            |
| ------ | --------------- | ---------------------- |
| POST   | `/api/register` | Register user          |
| POST   | `/api/login`    | Login user             |
| GET    | `/api/me`       | Get authenticated user |
| POST   | `/api/logout`   | Logout endpoint        |

## Task Management

| Method | Endpoint         | Description         |
| ------ | ---------------- | ------------------- |
| GET    | `/api/tasks`     | Get paginated tasks |
| GET    | `/api/tasks/:id` | Get task details    |
| POST   | `/api/tasks`     | Create task         |
| PUT    | `/api/tasks/:id` | Update task         |
| DELETE | `/api/tasks/:id` | Delete task         |

## Dashboard

| Method | Endpoint     | Description              |
| ------ | ------------ | ------------------------ |
| GET    | `/api/stats` | Get dashboard statistics |

## Administration

| Method | Endpoint     | Description                       |
| ------ | ------------ | --------------------------------- |
| GET    | `/api/users` | Get users for admin functionality |

Protected endpoints require JWT authentication.

---

# 8. Application Workflow

```text
User Opens Application
          |
          v
React Frontend
          |
          v
Login / Registration
          |
          v
Flask Authentication API
          |
          v
JWT Token
          |
          v
Dashboard
          |
          v
TanStack Query
          |
          v
Axios HTTP Request
          |
          v
Flask REST API
          |
          v
MySQL Database
          |
          v
JSON Response
          |
          v
TanStack Query Cache
          |
          v
React Components
          |
          v
Updated User Interface
```

---

# 9. Testing

The project includes the following test scenarios.

| Test Case          | Expected Result                            |
| ------------------ | ------------------------------------------ |
| Register User      | User account created                       |
| Login              | JWT authentication succeeds                |
| Dashboard          | Statistics displayed                       |
| Create Task        | Task stored in database                    |
| Edit Task          | Task information updated                   |
| Delete Task        | Task removed                               |
| Search             | Matching tasks displayed                   |
| Status Filter      | Filtered tasks displayed                   |
| Priority Filter    | Filtered tasks displayed                   |
| Pagination         | Correct page displayed                     |
| Query Caching      | Cached queries visible in Devtools         |
| Cache Invalidation | Related queries refreshed                  |
| Background Refetch | Statistics periodically refreshed          |
| Optimistic Update  | Cached task detail updated immediately     |
| Rollback           | Previous cached detail restored on failure |
| API Error          | Error state displayed                      |
| Responsive Layout  | UI adapts to different screen sizes        |

### Verified During Development

* Flask API connectivity
* TypeScript compilation
* Vite production build
* React Query Devtools integration
* Query cache visibility

Additional mutation and rollback scenarios can be verified using controlled API failure tests.

---

# 10. Production Build

Run:

```bash
cd frontend
```

```bash
npm run build
```

The production build generates the `dist` directory.

The frontend production build completed successfully during development.

---

# 11. Challenges Faced and Solutions

## Challenge 1: React and Flask Integration

**Problem:** Connecting the React frontend with the Flask backend.

**Solution:** Used Axios with a configured base URL and an interceptor to attach the JWT token to authenticated requests.

## Challenge 2: TypeScript Import Error

**Problem:** TypeScript reported an error when importing the CSS stylesheet.

**Solution:** Added Vite TypeScript declarations and configured the project to recognize Vite client types.

## Challenge 3: Keeping Dashboard Data Updated

**Problem:** Task statistics needed to reflect changes without manual browser refreshes.

**Solution:** Implemented `invalidateQueries()` and configured the statistics query with a 10-second refetch interval.

## Challenge 4: Managing Pagination Data

**Problem:** Different pages and filters required separate server responses.

**Solution:** Included filter parameters in TanStack Query keys to cache each result independently.

## Challenge 5: Handling Failed Updates

**Problem:** Optimistic UI changes could become inconsistent if the backend rejected an update.

**Solution:** Saved the previous cached task details and restored them using the `onError` rollback handler.

---

# 12. Mentor Review Questions and Answers

## Q1. What is TanStack Query?

TanStack Query is a library for managing server-side data in React applications.

It provides data fetching, caching, loading states, error handling, background refetching, and mutations.

## Q2. What is the difference between useQuery and useMutation?

`useQuery` is mainly used to fetch and cache server data.

`useMutation` is used to perform operations that change server data, such as creating, updating, or deleting records.

## Q3. What is a query key?

A query key uniquely identifies cached data.

For example:

```tsx
["tasks", { page: 1 }]
```

and

```tsx
["tasks", { page: 2 }]
```

are separate cached queries.

## Q4. What is cache invalidation?

Cache invalidation marks cached data as stale.

Active queries can then refetch updated information from the server.

I used it after creating, updating, and deleting tasks.

## Q5. What is an optimistic update?

An optimistic update changes cached UI data before the API request finishes.

It makes the application feel more responsive.

I implemented it for individual task details using `onMutate`.

## Q6. What is rollback?

Rollback restores previous cached data when an optimistic update fails.

I implemented rollback using the `onError` callback.

## Q7. What is staleTime?

`staleTime` determines how long cached data is considered fresh.

In my project, I configured it to 60 seconds.

## Q8. What is gcTime?

`gcTime` determines how long inactive cached queries remain in memory before garbage collection.

I configured it to 5 minutes.

## Q9. Why use TanStack Query instead of useEffect?

TanStack Query provides built-in caching, retries, background refetching, query invalidation, and loading/error states.

With `useEffect`, these behaviors would require more manual implementation.

## Q10. What is refetchInterval?

`refetchInterval` automatically refetches a query at a specified interval.

I used a 10-second interval for dashboard statistics.

## Q11. What is a dependent query?

A dependent query executes only when a required condition is satisfied.

I used the `enabled` option to fetch the users list only for administrators.

## Q12. What are parallel queries?

Parallel queries are independent requests that can execute simultaneously.

My dashboard uses separate queries for statistics and recent tasks.

## Q13. Why use Axios?

Axios simplifies API communication.

I used it to configure a base URL and automatically attach JWT tokens through request interceptors.

## Q14. How is authentication implemented?

The Flask backend authenticates users and issues JWT tokens.

The React frontend includes the token in authenticated API requests.

Protected backend routes validate the token.

## Q15. What was the hardest part of Task 22?

One challenging part was keeping the frontend synchronized with backend changes.

I addressed this using TanStack Query's mutation callbacks, query invalidation, and optimistic cache updates.

---

# 13. Key Learning Outcomes

Through Task 22, I learned:

* How TanStack Query manages server state.
* How to configure QueryClient.
* How to fetch data using `useQuery`.
* How to modify server data using `useMutation`.
* How query keys control caching.
* How to invalidate and refetch queries.
* How to implement pagination and filters.
* How to use conditional queries.
* How to implement optimistic updates.
* How to restore previous data after failed updates.
* How to inspect cached data using React Query Devtools.
* How to integrate React, Flask, JWT, and MySQL.

---

# 14. Future Improvements

Potential future enhancements include:

* Dark mode
* Task comments
* File attachments
* Real-time notifications using WebSockets
* Task activity history
* Drag-and-drop task boards
* Advanced reporting
* Persistent offline caching
* Task export functionality

---

# 15. Conclusion

TaskFlow demonstrates a full-stack task management workflow with React, TypeScript, Flask, and MySQL.

The main focus of Task 22 is TanStack Query and its server-state management capabilities.

The application demonstrates query caching, pagination, background refetching, cache invalidation, optimistic task-detail updates, rollback handling, and developer tooling.

This project helped me understand how to build more responsive and maintainable React applications that communicate with REST APIs.

---

## GitHub Repository

**Repository:** Task-22-TanStack-Query-Team-Task-Manager

**Developer:** Hariharan B.

**Task:** 22 – TanStack Query / React Query

**Project:** TaskFlow – Team Task Manager

---

**Thank you for reviewing my Task 22 project.**
