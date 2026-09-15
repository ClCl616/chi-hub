'use client';

import {
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Check,
  Circle,
  Dumbbell,
  HardDrive,
  NotebookPen,
  Play,
  TimerReset,
  UtensilsCrossed,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';

type Focus = {
  id: string;
  mode: string;
  duration_seconds: number;
  completed_at: string;
};
type Routine = {
  id: string;
  title: string;
  active: boolean;
  repeat_type: 'daily' | 'weekly';
  repeat_days: number[];
};
type RoutineCheck = { routine_id: string; checked_on: string };
type Sleep = { slept_at: string; woke_at: string | null };
type Workout = { workout_date: string; duration_minutes: number | null };
type Task = {
  id: string;
  title: string;
  task_date: string;
  completed: boolean;
};
type CalendarEvent = { id: string; title: string; event_date: string };
const dateKey = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

export function DashboardWorkspace() {
  const focus = useApi<{ sessions: Focus[] }>('/api/focus-sessions');
  const routines = useApi<{ routines: Routine[]; checks: RoutineCheck[] }>(
    '/api/routines',
  );
  const sleep = useApi<{ logs: Sleep[]; activeSleep: Sleep | null }>(
    '/api/sleep-logs',
  );
  const workouts = useApi<{ workouts: Workout[] }>('/api/workouts');
  const tasks = useApi<{ tasks: Task[] }>('/api/daily-tasks');
  const calendar = useApi<{ events: CalendarEvent[] }>('/api/calendar-events');
  const now = new Date();
  const today = dateKey(now);
  const sessions = (focus.data?.sessions ?? []).filter(
    (item) => item.mode === 'focus',
  );
  const todaySessions = sessions.filter(
    (item) => dateKey(new Date(item.completed_at)) === today,
  );
  const minutes = Math.round(
    todaySessions.reduce((sum, item) => sum + item.duration_seconds, 0) / 60,
  );
  const scheduled = (routines.data?.routines ?? []).filter(
    (item) =>
      item.active &&
      (item.repeat_type === 'daily' || item.repeat_days.includes(now.getDay())),
  );
  const checkedIds = new Set(
    (routines.data?.checks ?? [])
      .filter((item) => item.checked_on === today)
      .map((item) => item.routine_id),
  );
  const done = scheduled.filter((item) => checkedIds.has(item.id)).length;
  const lastSleep = (sleep.data?.logs ?? []).find((item) => item.woke_at);
  const sleepHours = lastSleep?.woke_at
    ? (new Date(lastSleep.woke_at).getTime() -
        new Date(lastSleep.slept_at).getTime()) /
      3_600_000
    : null;
  const todayWorkouts = (workouts.data?.workouts ?? []).filter(
    (item) => item.workout_date === today,
  );
  const workoutMinutes = todayWorkouts.reduce(
    (sum, item) => sum + (item.duration_minutes ?? 0),
    0,
  );
  const todayTasks = (tasks.data?.tasks ?? []).filter(
    (item) => item.task_date === today,
  );
  const upcoming = (calendar.data?.events ?? [])
    .filter((item) => item.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 4);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    const key = dateKey(date);
    const value = Math.round(
      sessions
        .filter((item) => dateKey(new Date(item.completed_at)) === key)
        .reduce((sum, item) => sum + item.duration_seconds, 0) / 60,
    );
    return {
      key,
      label: new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(
        date,
      ),
      value,
    };
  });
  const max = Math.max(1, ...days.map((day) => day.value));
  const metric = (loading: boolean, error: string, value: string) =>
    loading ? '…' : error ? '—' : value;
  const detail = (loading: boolean, error: string, value: string) =>
    loading ? '기록을 불러오는 중' : error ? '연결을 확인해주세요' : value;

  return (
    <div className="dashboard-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">
            {new Intl.DateTimeFormat('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            }).format(now)}
          </p>
          <h1>대시보드</h1>
        </div>
        <a className="primary-button" href="/notes">
          <NotebookPen size={17} />
          <span>메모 작성</span>
        </a>
      </header>
      <section className="overview-stats" aria-label="오늘의 요약">
        <a className="overview-stat" href="/focus">
          <div>
            <span>오늘의 집중</span>
            <TimerReset />
          </div>
          <strong>{metric(focus.loading, focus.error, minutes + '분')}</strong>
          <small>
            {detail(
              focus.loading,
              focus.error,
              todaySessions.length + '개 세션 완료',
            )}
          </small>
        </a>
        <a className="overview-stat" href="/morning">
          <div>
            <span>오늘의 루틴</span>
            <Check />
          </div>
          <strong>
            {metric(
              routines.loading,
              routines.error,
              done + ' / ' + scheduled.length,
            )}
          </strong>
          <small>
            {detail(
              routines.loading,
              routines.error,
              scheduled.length
                ? scheduled.length - done + '개 남았어요'
                : '오늘 예정된 루틴이 없어요',
            )}
          </small>
        </a>
        <a className="overview-stat" href="/sleep">
          <div>
            <span>최근 수면</span>
            <BedDouble />
          </div>
          <strong>
            {metric(
              sleep.loading,
              sleep.error,
              sleepHours === null ? '—' : sleepHours.toFixed(1) + '시간',
            )}
          </strong>
          <small>
            {detail(
              sleep.loading,
              sleep.error,
              sleep.data?.activeSleep
                ? '현재 수면 기록 중'
                : lastSleep
                  ? '최근 종료한 수면 기준'
                  : '아직 수면 기록이 없어요',
            )}
          </small>
        </a>
        <a className="overview-stat" href="/workouts">
          <div>
            <span>오늘의 운동</span>
            <Dumbbell />
          </div>
          <strong>
            {metric(workouts.loading, workouts.error, workoutMinutes + '분')}
          </strong>
          <small>
            {detail(
              workouts.loading,
              workouts.error,
              todayWorkouts.length + '개 운동 기록',
            )}
          </small>
        </a>
      </section>
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section className="dash-panel">
            <header className="dash-panel-header">
              <h2>집중 시간</h2>
              <span>최근 7일 · 분</span>
            </header>
            <DataNotice
              loading={focus.loading}
              error={focus.error}
              onRetry={focus.refresh}
            />
            {!focus.loading && !focus.error && (
              <>
                <figure
                  className="focus-chart"
                  aria-label={days
                    .map((day) => day.key + ': ' + day.value + '분')
                    .join(', ')}
                >
                  {days.map((day) => (
                    <div className="focus-chart-day" key={day.key}>
                      <span>{day.value}</span>
                      <div className="focus-chart-track">
                        <span
                          style={{ height: (day.value / max) * 100 + '%' }}
                        />
                      </div>
                      <small>{day.key === today ? '오늘' : day.label}</small>
                    </div>
                  ))}
                </figure>
                <p className="chart-caption">
                  7일간 총{' '}
                  <strong>
                    {days.reduce((sum, day) => sum + day.value, 0)}분
                  </strong>{' '}
                  집중했어요. 완료한 집중 세션을 기준으로 표시합니다.
                </p>
              </>
            )}
          </section>
          <section className="dash-panel">
            <header className="dash-panel-header">
              <h2>오늘 할 일</h2>
              <a href="/morning">
                전체 보기 <ArrowUpRight size={15} />
              </a>
            </header>
            <DataNotice
              loading={tasks.loading}
              error={tasks.error}
              onRetry={tasks.refresh}
            />
            {!tasks.loading &&
              !tasks.error &&
              (todayTasks.length ? (
                <ul className="dashboard-list">
                  {todayTasks.slice(0, 5).map((task) => (
                    <li key={task.id}>
                      <a href="/morning">
                        {task.completed ? (
                          <Check size={18} />
                        ) : (
                          <Circle size={18} />
                        )}
                        <div>
                          <strong
                            className={task.completed ? 'done-label' : ''}
                          >
                            {task.title}
                          </strong>
                          <small>{task.completed ? '완료' : '예정'}</small>
                        </div>
                        <ArrowUpRight size={15} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dash-empty">
                  오늘 할 일을 등록하면 이곳에 모아 보여드려요.
                </p>
              ))}
          </section>
          <section className="dash-panel">
            <header className="dash-panel-header">
              <h2>다가오는 일정</h2>
              <a href="/calendar">
                캘린더 <ArrowUpRight size={15} />
              </a>
            </header>
            <DataNotice
              loading={calendar.loading}
              error={calendar.error}
              onRetry={calendar.refresh}
            />
            {!calendar.loading &&
              !calendar.error &&
              (upcoming.length ? (
                <ul className="dashboard-list">
                  {upcoming.map((event) => (
                    <li key={event.id}>
                      <a href="/calendar">
                        <CalendarDays size={19} />
                        <div>
                          <strong>{event.title}</strong>
                          <small>
                            {event.event_date === today
                              ? '오늘'
                              : event.event_date}
                          </small>
                        </div>
                        <ArrowUpRight size={15} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dash-empty">등록된 예정 일정이 없어요.</p>
              ))}
          </section>
        </div>
        <aside className="dashboard-aside" aria-label="빠른 실행과 루틴">
          <section className="dash-panel focus-launch">
            <TimerReset aria-hidden="true" />
            <p className="card-label">FOCUS TIME</p>
            <h2>
              지금, 한 가지에
              <br />
              집중할 시간
            </h2>
            <p>타이머를 열고 오늘의 집중을 이어가세요.</p>
            <a href="/focus">
              집중 시작하기 <Play size={16} />
            </a>
          </section>
          <section className="dash-panel">
            <header className="dash-panel-header">
              <h2>오늘의 루틴</h2>
              <a href="/morning">
                관리 <ArrowUpRight size={15} />
              </a>
            </header>
            <DataNotice
              loading={routines.loading}
              error={routines.error}
              onRetry={routines.refresh}
            />
            {!routines.loading && !routines.error && (
              <>
                {scheduled.length > 0 && (
                  <progress
                    className="routine-progress"
                    aria-label="오늘의 루틴 완료"
                    max={scheduled.length}
                    value={done}
                  />
                )}
                {scheduled.length ? (
                  <ul className="dashboard-list">
                    {scheduled.slice(0, 4).map((routine) => (
                      <li key={routine.id}>
                        <a href="/morning">
                          {checkedIds.has(routine.id) ? (
                            <Check size={18} />
                          ) : (
                            <Circle size={18} />
                          )}
                          <div>
                            <strong
                              className={
                                checkedIds.has(routine.id) ? 'done-label' : ''
                              }
                            >
                              {routine.title}
                            </strong>
                            <small>
                              {checkedIds.has(routine.id) ? '완료' : '예정'}
                            </small>
                          </div>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dash-empty">
                    오늘 예정된 루틴이 없어요. 반복할 습관을 등록해보세요.
                  </p>
                )}
              </>
            )}
          </section>
          <section className="dash-panel">
            <header className="dash-panel-header">
              <h2>바로가기</h2>
            </header>
            <div className="dash-shortcuts">
              <a href="/notes">
                <NotebookPen size={18} />
                메모
              </a>
              <a href="/files">
                <HardDrive size={18} />
                드라이브
              </a>
              <a href="/meals">
                <UtensilsCrossed size={18} />
                학식
              </a>
              <a href="/sleep">
                <BedDouble size={18} />
                수면
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
