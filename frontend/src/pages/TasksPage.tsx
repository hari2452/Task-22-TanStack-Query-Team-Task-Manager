import { useState, useSyncExternalStore } from "react";
import { Plus, WifiOff } from "lucide-react";

import type { Task, TaskFilters } from "../types";

import { useTasks, useUsers } from "../hooks/useTasks";
import { useDebounce } from "../hooks/useDebounce";
import { useTaskMutations } from "../hooks/useTaskMutations";
import { useAuth } from "../context/AuthContext";

import FilterBar from "../components/FilterBar";
import Pagination from "../components/Pagination";
import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";

// Track browser connectivity
function subscribeToNetwork(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function useOnlineStatus() {
  return useSyncExternalStore(
    subscribeToNetwork,
    () => navigator.onLine,
    () => true
  );
}

interface TasksPageProps {
  compact?: boolean;
}

export default function TasksPage({
  compact = false,
}: TasksPageProps) {
  const { user } = useAuth();

  const isOnline = useOnlineStatus();

  // Local UI state
  const [filters, setFilters] = useState<TaskFilters>({
    page: 1,
    limit: compact ? 5 : 10,
  });

  const [editing, setEditing] = useState<Task | undefined>();

  const [modal, setModal] = useState(false);

  // Debounce search input
  const debouncedSearch = useDebounce(filters.search);

  // Parameters used by TanStack Query
  const effectiveFilters: TaskFilters = {
    ...filters,
    search: debouncedSearch,
  };

  // Fetch tasks from Flask
  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useTasks(effectiveFilters);

  // Fetch users for admin assignment
  const users = useUsers(user?.role === "admin");

  // Mutations
  const { remove } = useTaskMutations();

  // Update filters and reset pagination
  const change = (values: Partial<TaskFilters>) => {
    setFilters((previous) => ({
      ...previous,
      ...values,
      page:
        values.page !== undefined
          ? values.page
          : 1,
    }));
  };

  // Delete task
  const handleDelete = async (task: Task) => {
    if (remove.isPending) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) return;

    try {
      await remove.mutateAsync(task.id);
    } catch (error) {
      console.error("Delete task error:", error);
      alert("Failed to delete task. Please try again.");
    }
  };

  // Open add task modal
  const openAddModal = () => {
    setEditing(undefined);
    setModal(true);
  };

  // Open edit task modal
  const openEditModal = (task: Task) => {
    setEditing(task);
    setModal(true);
  };

  // Close modal
  const closeModal = () => {
    setModal(false);
    setEditing(undefined);
  };

  return (
    <section>
      {/* Page Header */}
      <div className="sectionhead">
        <div>
          <h2>
            {compact ? "Recent Tasks" : "All Tasks"}
          </h2>

          <p>
            Plan, prioritize, and keep work on track

            {isFetching && !isPending
              ? " · Syncing..."
              : ""}
          </p>
        </div>

        <button
          className="primary"
          onClick={openAddModal}
          disabled={!isOnline}
        >
          <Plus size={18} />
          New Task
        </button>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline">
          <WifiOff size={16} />
          You are offline. Cached tasks may still be available.
        </div>
      )}

      {/* Main Task Card */}
      <div className="card tablecard">
        <FilterBar
          filters={filters}
          change={change}
          users={
            user?.role === "admin"
              ? users.data
              : undefined
          }
        />

        {/* Loading Skeleton */}
        {isPending ? (
          <div className="skeletonwrap">
            {[1, 2, 3, 4].map((item) => (
              <div
                className="skeleton"
                key={item}
              />
            ))}
          </div>
        ) : isError ? (
          /* Error State */
          <div className="error">
            <p>Could not load tasks.</p>

            <p>
              {error instanceof Error
                ? error.message
                : "An unexpected error occurred."}
            </p>

            <button onClick={() => refetch()}>
              Retry
            </button>
          </div>
        ) : !data?.items.length ? (
          /* Empty State */
          <div className="empty">
            No tasks found. Create one to get started.
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="tablehead">
              <span>Task</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Assignee</span>
              <span>Due Date</span>
              <span>Actions</span>
            </div>

            {/* Task List */}
            {data.items.map((task) => {
              const canEdit =
                task.created_by === user?.id ||
                user?.role === "admin" ||
                task.assigned_to === user?.id;

              const canDelete =
                user?.role === "admin" ||
                task.created_by === user?.id;

              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={
                    canEdit
                      ? openEditModal
                      : undefined
                  }
                  onDelete={handleDelete}
                  canDelete={canDelete}
                />
              );
            })}

            {/* Pagination */}
            <Pagination
              page={filters.page}
              total={data.total}
              limit={filters.limit}
              onChange={(page) =>
                change({ page })
              }
            />
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <TaskForm
          task={editing}
          users={users.data}
          onClose={closeModal}
        />
      )}
    </section>
  );
}