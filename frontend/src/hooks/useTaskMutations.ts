import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createTask,
  updateTask,
  deleteTask,
} from "../api/tasks";

import type { Task } from "../types";

// Task mutation hooks
export function useTaskMutations() {
  const queryClient = useQueryClient();

  // Refresh task lists, dashboard stats and task details
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

  // ====================================
  // ADD TASK
  // ====================================

  const add = useMutation({
    mutationFn: createTask,

    onSuccess: async () => {
      await refreshQueries();
      console.log("Task created successfully");
    },

    onError: (error) => {
      console.error("Failed to create task:", error);
    },
  });

  // ====================================
  // UPDATE TASK
  // ====================================

  const update = useMutation({
    mutationFn: updateTask,

    onMutate: async ({ id, data }) => {
      // Stop an ongoing fetch from overwriting
      // our optimistic update.
      await queryClient.cancelQueries({
        queryKey: ["task", id],
      });

      // Save previous task data for rollback.
      const previousTask = queryClient.getQueryData<Task>([
        "task",
        id,
      ]);

      // Update cached task immediately.
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
    },

    onError: (error, _variables, context) => {
      // Restore previous data if update fails.
      if (context?.previousTask) {
        queryClient.setQueryData(
          ["task", context.id],
          context.previousTask
        );
      }

      console.error("Failed to update task:", error);
    },

    onSettled: async () => {
      // Refresh whether update succeeds or fails.
      await refreshQueries();
    },
  });

  // ====================================
  // DELETE TASK
  // ====================================

  const remove = useMutation({
    mutationFn: deleteTask,

    onSuccess: async () => {
      await refreshQueries();
      console.log("Task deleted successfully");
    },

    onError: (error) => {
      console.error("Failed to delete task:", error);
    },
  });

  return {
    add,
    update,
    remove,
  };
}