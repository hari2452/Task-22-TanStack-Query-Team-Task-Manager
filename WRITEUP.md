# Task 22 – TanStack Query Write-up

### 1. What is the difference between server state and client state? Give one example of each from your application.

**Server State:**
Server state is data stored on the backend or database and fetched through an API.

**Example from my project:**
In my TaskFlow application, task details such as title, status, priority, and assigned user are stored in MySQL. I fetch these tasks from the Flask API using TanStack Query's `useQuery`.

**Client State:**
Client state is data managed locally in the frontend for user interface interactions.

**Example from my project:**
The selected search text, status filter, and current pagination page are managed using React's `useState`.

**Main Difference:**
Server state comes from the backend, while client state controls frontend interactions.

---

### 2. What is a query key in TanStack Query? Why does `['tasks', { status: 'todo' }]` cache separately from `['tasks']`?

A **query key** is a unique identifier used by TanStack Query to store and manage cached API data.

**Example:**

```javascript
["tasks"]
```

This represents the general task list.

```javascript
["tasks", { status: "todo" }]
```

This represents tasks filtered by the `todo` status.

TanStack Query stores them separately because their query keys are different.

**In my project:**

```typescript
queryKey: ["tasks", filters]
```

When the user changes the status filter, the query key changes, allowing TanStack Query to fetch and cache the filtered results separately.

**Benefit:** It prevents different filter results from overwriting each other and improves performance.

---

### 3. What does `invalidateQueries` do after a mutation? What would happen if you forgot to call it?

`invalidateQueries` marks matching cached queries as stale and triggers refetching for active queries.

**Example from my project:**

```typescript
queryClient.invalidateQueries({
  queryKey: ["tasks"],
});
```

After creating, updating, or deleting a task, I invalidate the task queries so the latest data is fetched from the Flask backend.

I also invalidate the dashboard statistics.

**If I forget to call it:**

The application may continue displaying outdated task information or incorrect dashboard counts until the queries refetch for another reason.

**Benefit:** It keeps the frontend synchronized with the backend without manually refreshing the browser.

---

### 4. What is `staleTime` and how did you use it in this project? What problem does it solve?

`staleTime` defines how long cached query data is considered fresh.

**Example from my project:**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
});
```

I configured `staleTime` to **60 seconds**.

During this period, TanStack Query considers the cached data fresh and generally avoids unnecessary automatic refetching.

After 60 seconds, the data becomes stale and can be refetched when certain events occur, such as reopening a component or returning to the browser tab.

**Problem it solves:**

Without an appropriate `staleTime`, the application may make unnecessary API requests even when the cached data is still recent.

**Benefit:** It reduces API calls, improves performance, and makes the application faster.

**Note:** My dashboard statistics also use `refetchInterval: 10000`, so they are refreshed every 10 seconds while the query is active, independently of the 60-second `staleTime`.

---

### Conclusion

In Task 22, I learned how to manage server data efficiently using TanStack Query.

I implemented query keys, caching, mutations, cache invalidation, and `staleTime` to improve application performance and keep task information synchronized with the Flask backend.
