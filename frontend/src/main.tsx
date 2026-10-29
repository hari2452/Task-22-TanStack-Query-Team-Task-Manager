import React from "react";
import ReactDOM from "react-dom/client";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { AuthProvider } from "./context/AuthContext";

import App from "./App";
import "./style.css";

// TanStack Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cached data remains fresh for 1 minute
      staleTime: 1000 * 60,

      // Inactive queries remain cached for 5 minutes
      gcTime: 1000 * 60 * 5,

      // Retry failed requests once
      retry: 1,

      // Refetch stale data when returning to the tab
      refetchOnWindowFocus: true,

      // Refetch stale data when a component mounts
      refetchOnMount: true,

      // Refetch stale data after reconnecting
      refetchOnReconnect: true,
    },
  },
});

// Render React application
ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>

      {/* TanStack Query Devtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);