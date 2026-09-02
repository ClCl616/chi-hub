'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';

type Mode = 'focus' | 'short' | 'long';
type Session = {
  id: string;
  task: string;
  mode: Mode;
  duration_seconds: number;
  completed_at: string;
};
const modes: { id: Mode; label: string; minutes: number }[] = [
  { id: 'focus', label: '집중', minutes: 25 },
  { id: 'short', label: '짧은 휴식', minutes: 5 },
  { id: 'long', label: '긴 휴식', minutes: 15 },
];
const storageKey = 'chi-hub-focus-timer-v2';

export function FocusTimer() {
  const history = useApi<{ sessions: Session[] }>('/api/focus-sessions');
  const [mode, setMode] = useState<Mode>('focus');
  const duration = modes.find((item) => item.id === mode)?.minutes ?? 25;
  const [seconds, setSeconds] = useState(duration * 60);
  const [running, setRunning] = useState(false);
  const [task, setTask] = useState('');
  const [syncState, setSyncState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [completion, setCompletion] = useState<Mode | null>(null);
  const endAt = useRef<number | null>(null);
  const savedEnd = useRef<number | null>(null);
  const saveSession = async (
    payload = { task, mode, durationSeconds: duration * 60 },
  ) => {
    setSyncState('saving');
    try {
      await apiRequest('/api/focus-sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSyncState('saved');
      await history.refresh();
    } catch {
      setSyncState('error');
    }
  };
  /* oxlint-disable react/react-compiler, react-hooks/exhaustive-deps -- restore and tick an external wall-clock timer */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        mode: Mode;
        task: string;
        durationSeconds: number;
        endAt: number | null;
        remaining: number;
      };
      setMode(saved.mode);
      setTask(saved.task);
      const left = saved.endAt
        ? Math.max(0, Math.ceil((saved.endAt - Date.now()) / 1000))
        : saved.remaining;
      setSeconds(left);
      if (saved.endAt && left > 0) {
        endAt.current = saved.endAt;
        setRunning(true);
      } else if (
        saved.endAt &&
        left === 0 &&
        savedEnd.current !== saved.endAt
      ) {
        savedEnd.current = saved.endAt;
        localStorage.removeItem(storageKey);
        setCompletion(saved.mode);
        void saveSession({
          task: saved.task,
          mode: saved.mode,
          durationSeconds: saved.durationSeconds,
        });
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, []);
  useEffect(() => {
    if (!running || !endAt.current) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((endAt.current! - Date.now()) / 1000));
      setSeconds(left);
      if (left === 0) {
        const completedEnd = endAt.current;
        setRunning(false);
        endAt.current = null;
        localStorage.removeItem(storageKey);
        if (savedEnd.current !== completedEnd) {
          savedEnd.current = completedEnd;
          setCompletion(mode);
          void saveSession();
          if ('Notification' in window && Notification.permission === 'granted')
            new Notification('CHI.HUB', {
              body:
                mode === 'focus'
                  ? '집중 세션을 완료했어요.'
                  : '휴식이 끝났어요.',
            });
        }
      }
    };
    tick();
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [running, task, mode, duration]);
  /* oxlint-enable react/react-compiler, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (running && endAt.current)
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          mode,
          task,
          durationSeconds: duration * 60,
          endAt: endAt.current,
          remaining: seconds,
        }),
      );
  }, [running, mode, task, duration, seconds]);
  const time = useMemo(
    () =>
      `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`,
    [seconds],
  );
  const progress = 1 - seconds / (duration * 60);
  const today = new Date();
  const allTodaySessions = (history.data?.sessions ?? []).filter(
    (item) =>
      new Date(item.completed_at).toDateString() === today.toDateString(),
  );
  const todaySessions = allTodaySessions.filter(
    (item) => item.mode === 'focus',
  );
  const todayMinutes = Math.round(
    todaySessions.reduce((sum, item) => sum + item.duration_seconds, 0) / 60,
  );
  function changeMode(next: Mode) {
    if (
      running &&
      !window.confirm('진행 중인 타이머를 멈추고 모드를 바꿀까요?')
    )
      return;
    setMode(next);
    const minutes = modes.find((item) => item.id === next)?.minutes ?? 25;
    setSeconds(minutes * 60);
    setRunning(false);
    endAt.current = null;
    localStorage.removeItem(storageKey);
  }
  function toggle() {
    if (seconds === 0) setSeconds(duration * 60);
    if (running) {
      setRunning(false);
      const remaining = endAt.current
        ? Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))
        : seconds;
      setSeconds(remaining);
      endAt.current = null;
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          mode,
          task,
          durationSeconds: duration * 60,
          endAt: null,
          remaining,
        }),
      );
    } else {
      const remaining = seconds === 0 ? duration * 60 : seconds;
      endAt.current = Date.now() + remaining * 1000;
      setRunning(true);
      setSyncState('idle');
      if ('Notification' in window && Notification.permission === 'default')
        void Notification.requestPermission();
    }
  }
  function reset() {
    setRunning(false);
    setSeconds(duration * 60);
    endAt.current = null;
    localStorage.removeItem(storageKey);
    setSyncState('idle');
  }
  async function remove(id: string) {
    if (!window.confirm('이 집중 기록을 삭제할까요?')) return;
    try {
      await apiRequest(`/api/focus-sessions?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await history.refresh();
    } catch {
      setSyncState('error');
    }
  }
  const syncText = {
    idle: '완료된 세션은 계정에 자동 저장됩니다.',
    saving: '세션을 저장하는 중…',
    saved: '세션이 안전하게 저장됐습니다.',
    error: '세션을 저장하지 못했습니다.',
  }[syncState];
  return (
    <>
      <section className="timer-workspace">
        <div className="timer-panel">
          <div className="mode-tabs" role="tablist" aria-label="타이머 모드">
            {modes.map((item) => (
              <button
                aria-selected={mode === item.id}
                className={mode === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => changeMode(item.id)}
                role="tab"
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="task-field">
            <span>이번 세션에 집중할 일</span>
            <input
              maxLength={80}
              onChange={(event) => setTask(event.target.value)}
              placeholder="예: 프로젝트 기획안 완성하기"
              value={task}
            />
          </label>
          <div
            className="timer-ring"
            style={
              {
                '--progress': `${Math.max(0, progress) * 360}deg`,
              } as React.CSSProperties
            }
          >
            <div>
              <span>{mode === 'focus' ? 'FOCUS' : 'BREAK'}</span>
              <strong aria-live="polite">{time}</strong>
              <small>{task || '집중할 일을 입력하세요'}</small>
            </div>
          </div>
          <div className="timer-controls">
            <button
              aria-label="타이머 초기화"
              className="round-control"
              onClick={reset}
              type="button"
            >
              <RotateCcw size={19} />
            </button>
            <button className="play-control" onClick={toggle} type="button">
              {running ? (
                <>
                  <Pause size={21} /> 일시정지
                </>
              ) : (
                <>
                  <Play size={21} /> {seconds === 0 ? '다시 시작' : '시작'}
                </>
              )}
            </button>
          </div>
        </div>
        <aside className="focus-summary">
          <div>
            <p className="card-label">TODAY</p>
            <strong>{allTodaySessions.length}</strong>
            <span>완료 · 집중 {todayMinutes}분</span>
          </div>
          <div className="focus-guide">
            <CheckCircle2 size={19} />
            <p>
              <strong>한 번에 한 가지</strong>
              <span>알림을 끄고 선택한 일에만 집중해보세요.</span>
            </p>
          </div>
          <output className={`sync-note ${syncState}`}>{syncText}</output>
        </aside>
      </section>
      <section className="workspace-card focus-history">
        <div className="section-title">
          <div>
            <p className="card-label">
              <Clock3 size={16} /> HISTORY
            </p>
            <h2>최근 세션</h2>
          </div>
        </div>
        <DataNotice
          loading={history.loading}
          error={history.error}
          onRetry={history.refresh}
        />
        <div className="record-list">
          {(history.data?.sessions ?? []).slice(0, 10).map((item) => (
            <article className="record-row" key={item.id}>
              <div>
                <strong>
                  {item.task || (item.mode === 'focus' ? '집중 세션' : '휴식')}
                </strong>
                <span>
                  {new Intl.DateTimeFormat('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(item.completed_at))}{' '}
                  · {Math.round(item.duration_seconds / 60)}분
                </span>
              </div>
              <button
                aria-label="집중 기록 삭제"
                className="icon-button"
                onClick={() => remove(item.id)}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
        {!history.loading &&
          !history.error &&
          !history.data?.sessions.length && (
            <DataNotice empty="완료한 세션이 여기에 쌓입니다." />
          )}
      </section>
      {completion && (
        <div className="completion-overlay" role="presentation">
          <dialog
            aria-describedby="completion-description"
            aria-labelledby="completion-title"
            className="completion-card"
            open
          >
            <CheckCircle2 size={34} />
            <p className="card-label">SESSION COMPLETE</p>
            <h2 id="completion-title">
              {completion === 'focus' ? '집중 완료!' : '휴식 완료!'}
            </h2>
            <p id="completion-description">
              {completion === 'focus'
                ? '오늘의 집중 기록에 안전하게 저장했어요.'
                : '충분히 쉬었어요. 다음 집중을 준비해볼까요?'}
            </p>
            <button onClick={() => setCompletion(null)} type="button">
              확인
            </button>
          </dialog>
        </div>
      )}
    </>
  );
}
