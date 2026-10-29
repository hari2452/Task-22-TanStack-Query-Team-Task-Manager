import { useMemo } from "react";
import { useStats, useTasks } from "../hooks/useTasks";
import { useAuth } from "../context/AuthContext";

import StatsPanel from "../components/StatsPanel";
import TasksPage from "./TasksPage";

export default function Dashboard() {
  const { user } = useAuth();

  // =====================================
  // PARALLEL TANSTACK QUERIES
  // =====================================

  // Query 1: Dashboard statistics
  // Automatically refreshes every 10 seconds
  const {
    data: stats,
    isPending: statsLoading,
    isError: statsError,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useStats();

  // Query 2: Recent tasks
  // Runs independently of the stats query
  const {
    data: recentTasks,
    isPending: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useTasks({
    page: 1,
    limit: 5,
  });

  // =====================================
  // TEAM PROGRESS CALCULATION
  // =====================================

  const progress = useMemo(() => {
    if (!stats || stats.total === 0) {
      return 0;
    }

    return Math.round(
      (stats.done / stats.total) * 100
    );
  }, [stats]);

  const firstName = user?.name?.split(" ")[0] || "User";

  // =====================================
  // REFRESH DASHBOARD
  // =====================================

  const refreshDashboard = async () => {
    await Promise.all([
      refetchStats(),
      refetchTasks(),
    ]);
  };

  // =====================================
  // RENDER
  // =====================================

  return (
    <>
      {/* Dashboard Header */}
      <div className="pagehead">
        <div className="eyebrow">
          OVERVIEW
        </div>

        <h1>
          Good day, {firstName} 👋
        </h1>

        <p>
          Here's what's happening with your team's work today.
        </p>

        <button
          className="primary"
          onClick={refreshDashboard}
          disabled={statsFetching}
        >
          {statsFetching ? "Refreshing..." : "Refresh Dashboard"}
        </button>
      </div>

      {/* Dashboard Statistics */}
      <StatsPanel />

      {/* Team Progress */}
      <div className="progress card">
        <div>
          <strong>Team Progress</strong>

          {statsLoading ? (
            <p>Loading team progress...</p>
          ) : statsError ? (
            <p>Unable to load statistics.</p>
          ) : (
            <p>
              {stats?.done ?? 0} of {stats?.total ?? 0} tasks completed
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="progressbar">
          <div
            style={{
              width: `${progress}%`,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        <strong>{progress}%</strong>
      </div>

      {/* Recent Tasks */}
      <div>
        {tasksLoading && (
          <p>Loading recent tasks...</p>
        )}

        {tasksError && (
          <div className="error">
            <p>Unable to load recent tasks.</p>

            <button onClick={() => refetchTasks()}>
              Retry
            </button>
          </div>
        )}

        {recentTasks && (
          <TasksPage compact />
        )}
      </div>
    </>
  );
}