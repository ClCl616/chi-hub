'use client';

import Link from 'next/link';
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
  const hasError =
    focus.error || routines.error || sleep.error || workouts.error;
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
          <h1>오늘도, 나답게.</h1>
          <p className="page-description">
            하루의 리듬을 한곳에서 가볍게 확인하세요.
          </p>
        </div>
        <Link className="primary-button" href="/notes">
          <span>빠른 기록</span>
          <ArrowUpRight size={17} />
        </Link>
      </div>
      {hasError && (
        <output className="service-banner">
          일부 기록을 불러오지 못했습니다. 연결 상태를 확인해주세요.
        </output>
      )}
      <section className="dashboard-grid" aria-label="오늘의 요약">
        <article className="focus-card">
          <div className="card-label">
            <TimerReset size={17} /> 오늘의 집중
          </div>
          <div className="timer-value">
            {focusMinutes}
            <small>분</small>
          </div>
          <p>
            {todayFocus.length
              ? `${todayFocus.length}개의 세션을 완료했어요.`
              : '첫 번째 집중 세션을 시작해볼까요?'}
          </p>
          <Link className="timer-button" href="/focus">
            {todayFocus.length ? '기록 보기' : '집중 시작'}
          </Link>
        </article>
        <Link className="summary-card" href="/morning">
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
        </Link>
        <Link className="summary-card" href="/morning">
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
        </Link>
        <article className="week-card">
          <div className="card-header">
            <div>
              <p className="card-label">이번 주 흐름</p>
              <h2>기록이 쌓이는 중</h2>
            </div>
            <Link href="/workouts">
              <Dumbbell size={15} /> 운동 기록
            </Link>
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
