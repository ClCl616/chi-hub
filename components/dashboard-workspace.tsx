'use client';

import { ArrowUpRight, Check, Dumbbell, Moon, TimerReset } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

type Focus = {
  id: string;
  mode: string;
  duration_seconds: number;
  completed_at: string;
};
type Routine = { id: string; active: boolean };
type RoutineCheck = { routine_id: string; checked_on: string };
type Sleep = { slept_at: string; woke_at: string };
type Workout = { workout_date: string; duration_minutes: number | null };
const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function DashboardWorkspace() {
  const focus = useApi<{ sessions: Focus[] }>('/api/focus-sessions');
  const routines = useApi<{ routines: Routine[]; checks: RoutineCheck[] }>(
    '/api/routines',
  );
  const sleep = useApi<{ logs: Sleep[] }>('/api/sleep-logs');
  const workouts = useApi<{ workouts: Workout[] }>('/api/workouts');
  const now = new Date();
  const today = dateKey(now);
  const todayFocus = (focus.data?.sessions ?? []).filter(
    (item) =>
      item.mode === 'focus' && dateKey(new Date(item.completed_at)) === today,
  );
  const focusMinutes = Math.round(
    todayFocus.reduce((sum, item) => sum + item.duration_seconds, 0) / 60,
  );
  const active = (routines.data?.routines ?? []).filter((item) => item.active);
  const done = new Set(
    (routines.data?.checks ?? [])
      .filter((item) => item.checked_on === today)
      .map((item) => item.routine_id),
  ).size;
  const lastSleep = sleep.data?.logs[0];
  const sleepHours = lastSleep
    ? (new Date(lastSleep.woke_at).getTime() -
        new Date(lastSleep.slept_at).getTime()) /
      3_600_000
    : 0;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = dateKey(date);
    const focusCount = (focus.data?.sessions ?? []).filter(
      (item) =>
        item.mode === 'focus' && dateKey(new Date(item.completed_at)) === key,
    ).length;
    const workoutCount = (workouts.data?.workouts ?? []).filter(
      (item) => item.workout_date === key,
    ).length;
    const checks = (routines.data?.checks ?? []).filter(
      (item) => item.checked_on === key,
    ).length;
    return {
      label: new Intl.DateTimeFormat('ko-KR', { weekday: 'short' })
        .format(date)
        .slice(0, 1),
      value: focusCount * 25 + workoutCount * 20 + checks * 5,
    };
  });
  const max = Math.max(1, ...days.map((day) => day.value));
  const unavailableCount = [
    focus.error,
    routines.error,
    sleep.error,
    workouts.error,
  ].filter(Boolean).length;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            }).format(now)}
          </p>
          <h1>오늘의 기록</h1>
          <p className="page-description">
            집중과 루틴, 최근 흐름을 확인하세요.
          </p>
        </div>
        <a className="primary-button" href="/notes">
          <span>빠른 기록</span>
          <ArrowUpRight size={17} />
        </a>
      </div>
      {unavailableCount === 4 && (
        <output className="service-banner">
          기록 서비스를 잠시 사용할 수 없습니다. 잠시 후 다시 시도해주세요.
        </output>
      )}
      <section className="dashboard-grid" aria-label="오늘의 요약">
        <article className="focus-card">
          <div className="card-label">
            <TimerReset size={17} /> 오늘의 집중
          </div>
          <div className="focus-card-body">
            <div className="timer-value">
              {focusMinutes}
              <small>분</small>
            </div>
            <p>
              {todayFocus.length
                ? `${todayFocus.length}개의 세션을 완료했어요.`
                : '첫 집중을 시작해보세요.'}
            </p>
          </div>
          <a className="timer-button" href="/focus">
            {todayFocus.length ? '기록 보기' : '집중 시작'}
          </a>
        </article>
        <a className="summary-card" href="/morning">
          <div className="summary-icon">
            <Moon size={20} />
          </div>
          <div>
            <span>최근 수면</span>
            <strong>
              {sleepHours ? `${sleepHours.toFixed(1)}시간` : '— 시간'}
            </strong>
            <small>
              {sleepHours ? '수면 기록에서 자세히 보기' : '아직 기록이 없어요'}
            </small>
          </div>
        </a>
        <a className="summary-card" href="/morning">
          <div className="summary-icon">
            <Check size={20} />
          </div>
          <div>
            <span>오늘의 루틴</span>
            <strong>
              {done} / {active.length}
            </strong>
            <small>
              {active.length
                ? '작은 것부터 이어가세요'
                : '첫 루틴을 만들어보세요'}
            </small>
          </div>
        </a>
        <article className="week-card">
          <div className="card-header">
            <div>
              <p className="card-label">이번 주 흐름</p>
              <h2>기록이 쌓이는 중</h2>
            </div>
            <a href="/workouts">
              <Dumbbell size={15} /> 운동 기록
            </a>
          </div>
          <div className="week-chart" aria-label="최근 7일 활동 기록">
            {days.map((day, index) => (
              <div className="day" key={index}>
                <div className="bar-track">
                  <span
                    style={{
                      height: `${day.value ? Math.max(12, (day.value / max) * 100) : 3}%`,
                    }}
                  />
                </div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
