'use client';
import { useEffect } from 'react';
import { useApi } from '@/hooks/use-api';

const dateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

export function WorkspaceStatus() {
  const focus = useApi<{
    sessions: {
      mode: string;
      completed_at: string;
      duration_seconds: number;
    }[];
  }>('/api/focus-sessions');
  const routines = useApi<{
    routines: {
      id: string;
      active: boolean;
      repeat_type: string;
      repeat_days: number[];
    }[];
    checks: { routine_id: string; checked_on: string }[];
  }>('/api/routines');
  const tasks = useApi<{ tasks: { task_date: string; completed: boolean }[] }>(
    '/api/daily-tasks',
  );
  const refreshFocus = focus.refresh,
    refreshRoutines = routines.refresh,
    refreshTasks = tasks.refresh;
  useEffect(() => {
    const changed = (event: Event) => {
      const source = (event as CustomEvent<string>).detail;
      if (source === '/api/focus-sessions') void refreshFocus();
      if (source === '/api/routines') void refreshRoutines();
      if (source === '/api/daily-tasks') void refreshTasks();
    };
    window.addEventListener('chi-hub-data-changed', changed);
    return () => window.removeEventListener('chi-hub-data-changed', changed);
  }, [refreshFocus, refreshRoutines, refreshTasks]);
  const now = new Date(),
    today = dateKey(now);
  const minutes = Math.round(
    (focus.data?.sessions ?? [])
      .filter(
        (item) =>
          item.mode === 'focus' &&
          dateKey(new Date(item.completed_at)) === today,
      )
      .reduce((sum, item) => sum + item.duration_seconds, 0) / 60,
  );
  const scheduled = (routines.data?.routines ?? []).filter(
    (item) =>
      item.active &&
      (item.repeat_type === 'daily' || item.repeat_days.includes(now.getDay())),
  );
  const checked = new Set(
    (routines.data?.checks ?? [])
      .filter((item) => item.checked_on === today)
      .map((item) => item.routine_id),
  );
  const done = scheduled.filter((item) => checked.has(item.id)).length;
  const pending = (tasks.data?.tasks ?? []).filter(
    (item) => item.task_date === today && !item.completed,
  ).length;
  const value = (loading: boolean, error: string, text: string) =>
    loading ? '…' : error ? '—' : text;
  return (
    <dl className="workspace-metrics">
      <div>
        <dt>오늘 집중</dt>
        <dd>{value(focus.loading, focus.error, minutes + '분')}</dd>
      </div>
      <div>
        <dt>루틴 완료</dt>
        <dd>
          {value(
            routines.loading,
            routines.error,
            done + ' / ' + scheduled.length,
          )}
        </dd>
      </div>
      <div>
        <dt>남은 할 일</dt>
        <dd>{value(tasks.loading, tasks.error, pending + '개')}</dd>
      </div>
    </dl>
  );
}
