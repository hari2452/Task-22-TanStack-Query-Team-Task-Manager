import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchTask,
  fetchTasks,
  fetchStats,
  fetchUsers,
} from "../api/tasks";

import type { TaskFilters } from "../types";

// Fetch tasks with filters and pagination
export const useTasks = (filters: TaskFilters) =>
  useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
    placeholderData: (previous) => previous,
  });

// Fetch a single task
export const useTask = (id: number) =>
  useQuery({
    queryKey: ["task", id],
    queryFn: () => fetchTask(id),
    enabled: id > 0,
  });

// Dashboard statistics - refresh every 10 seconds
export const useStats = () =>
  useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 10000,
  });

// Fetch users when enabled
export const useUsers = (enabled: boolean) =>
  useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled,
  });

// Prefetch task details
export function usePrefetchTask() {
  const client = useQueryClient();

  return (id: number) =>
    client.prefetchQuery({
      queryKey: ["task", id],
      queryFn: () => fetchTask(id),
      staleTime: 60000,
    });
}