'use client';

import { useMemo, useState } from 'react';
import { BedDouble, Check, Moon, Plus, Square, Trash2 } from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';

type Routine = { id: string; title: string; position: number; active: boolean };
type CheckRow = { id: string; routine_id: string; checked_on: string };
type SleepLog = {
  id: string;
  slept_at: string;
  woke_at: string | null;
  quality: number | null;
  note: string | null;
};
const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const qualityLabels: Record<string, string> = {
  '1': '매우 아쉬움',
  '2': '아쉬움',
  '3': '보통',
  '4': '좋음',
  '5': '아주 좋음',
};

export function MorningWorkspace() {
  const routines = useApi<{ routines: Routine[]; checks: CheckRow[] }>(
    '/api/routines',
  );
  const sleep = useApi<{ logs: SleepLog[]; activeSleep: SleepLog | null }>('/api/sleep-logs');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [quality, setQuality] = useState('3');
  const [note, setNote] = useState('');
  const today = dateKey();
  const checked = new Set(
    (routines.data?.checks ?? [])
      .filter((item) => item.checked_on === today)
      .map((item) => item.routine_id),
  );
  const active = (routines.data?.routines ?? []).filter((item) => item.active);
  const done = active.filter((item) => checked.has(item.id)).length;
  const sleepAverage = useMemo(() => {
    const logs = (sleep.data?.logs ?? []).filter((item) => item.woke_at);
    if (!logs.length) return 0;
    return (
      logs.reduce(
        (sum, item) =>
          sum +
          (new Date(item.woke_at!).getTime() -
            new Date(item.slept_at).getTime()) /
            3_600_000,
        0,
      ) / logs.length
    );
  }, [sleep.data]);

  async function addRoutine(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setBusy('routine');
    setMessage('');
    try {
      await apiRequest('/api/routines', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      setTitle('');
      await routines.refresh();
      setMessage('루틴을 추가했어요. 오늘부터 바로 체크할 수 있어요.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '저장하지 못했습니다.',
      );
    } finally {
      setBusy('');
    }
  }
  async function addSuggestedRoutine(suggestedTitle: string) {
    setBusy('routine');
    setMessage('');
    try {
      await apiRequest('/api/routines', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: suggestedTitle }) });
      await routines.refresh();
      setMessage(`“${suggestedTitle}” 루틴을 추가했어요.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장하지 못했습니다.');
    } finally {
      setBusy('');
    }
  }
  async function toggleRoutine(id: string, next: boolean) {
    setBusy(id);
    try {
      await apiRequest('/api/routines', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, checked: next, date: today }),
      });
      await routines.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '변경하지 못했습니다.',
      );
    } finally {
      setBusy('');
    }
  }
  async function removeRoutine(id: string) {
    if (!window.confirm('이 루틴과 체크 기록을 삭제할까요?')) return;
    setBusy(id);
    try {
      await apiRequest(`/api/routines?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await routines.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '삭제하지 못했습니다.',
      );
    } finally {
      setBusy('');
    }
  }
  async function startSleep() {
    setBusy('sleep');
    setMessage('');
    try {
      await apiRequest('/api/sleep-logs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      await sleep.refresh();
      setMessage('수면을 시작했어요. 일어나면 여기서 종료해주세요.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '저장하지 못했습니다.',
      );
    } finally {
      setBusy('');
    }
  }
  async function stopSleep() {
    const activeSleep = sleep.data?.activeSleep;
    if (!activeSleep) return;
    setBusy('sleep');
    setMessage('');
    try {
      await apiRequest('/api/sleep-logs', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: activeSleep.id, quality: Number(quality), note }) });
      setNote('');
      await sleep.refresh();
      setMessage('수면 시간을 기록했어요.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '저장하지 못했습니다.');
    } finally {
      setBusy('');
    }
  }
  async function removeSleep(id: string) {
    if (!window.confirm('이 수면 기록을 삭제할까요?')) return;
    setBusy(id);
    try {
      await apiRequest(`/api/sleep-logs?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await sleep.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '삭제하지 못했습니다.',
      );
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="workspace-grid morning-grid">
      {message && (
        <div className="form-message error" role="alert">
          {message}
        </div>
      )}
      <section className="workspace-card routine-card">
        <div className="section-title">
          <div>
            <p className="card-label">
              <Check size={16} /> 오늘의 루틴
            </p>
            <h2>
              {done} / {active.length} 완료
            </h2>
          </div>
          <span>
            {active.length ? Math.round((done / active.length) * 100) : 0}%
          </span>
        </div>
        {!!active.length && <div className="progress-track">
          <span
            style={{
              width: `${active.length ? (done / active.length) * 100 : 0}%`,
            }}
          />
        </div>}
        <p className="routine-reset-note">
          완료 체크는 매일 자정 새로 시작하며, 지난 기록은 그대로 보관됩니다.
        </p>
        <form className="inline-form" onSubmit={addRoutine}>
          <input
            aria-label="새 루틴"
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="새 루틴을 입력하세요"
            value={title}
          />
          <button disabled={busy === 'routine'} type="submit">
            <Plus size={17} /> 추가
          </button>
        </form>
        {!active.length && (
          <div className="routine-suggestions" aria-label="추천 루틴">
            <span>빠르게 시작하기</span>
            {['물 한 잔', '5분 스트레칭', '오늘의 우선순위'].map((suggestion) => (
              <button disabled={busy === 'routine'} key={suggestion} onClick={() => addSuggestedRoutine(suggestion)} type="button">+ {suggestion}</button>
            ))}
          </div>
        )}
        <DataNotice
          loading={routines.loading}
          error={routines.error}
          onRetry={routines.refresh}
        />
        <div className="check-list">
          {active.map((item) => (
            <div
              className={`check-row ${checked.has(item.id) ? 'done' : ''}`}
              key={item.id}
            >
              <button
                aria-label={`${item.title} ${checked.has(item.id) ? '완료 취소' : '완료'}`}
                className="check-button"
                disabled={busy === item.id}
                onClick={() => toggleRoutine(item.id, !checked.has(item.id))}
                type="button"
              >
                {checked.has(item.id) && <Check size={16} />}
              </button>
              <span>{item.title}</span>
              <button
                aria-label={`${item.title} 삭제`}
                className="icon-button"
                onClick={() => removeRoutine(item.id)}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        {!routines.loading && !routines.error && !active.length && (
          <DataNotice empty="아침 물 한 잔처럼 작고 쉬운 루틴부터 추가해보세요." />
        )}
      </section>
      <section className="workspace-card sleep-card">
        <div className="section-title">
          <div>
            <p className="card-label">
              <Moon size={16} /> 수면 기록
            </p>
            <h2>
              {sleepAverage
                ? `평균 ${sleepAverage.toFixed(1)}시간`
                : '첫 수면을 기록하세요'}
            </h2>
          </div>
        </div>
        <div className="stack-form sleep-timer-form">
          {sleep.data?.activeSleep ? (
            <div className="sleep-running">
              <span>수면 진행 중</span>
              <strong>{new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(new Date(sleep.data.activeSleep.slept_at))}에 시작했어요</strong>
              <small>일어나면 종료를 눌러 수면 시간을 자동 기록하세요.</small>
            </div>
          ) : (
            <p className="sleep-intro">잠들기 직전에 시작을 누르세요. 기상 시각은 종료할 때 자동으로 기록됩니다.</p>
          )}
          <label>
            <span>수면 만족도</span>
            <select
              onChange={(event) => setQuality(event.target.value)}
              value={quality}
            >
              <option value="1">매우 아쉬움</option>
              <option value="2">아쉬움</option>
              <option value="3">보통</option>
              <option value="4">좋음</option>
              <option value="5">아주 좋음</option>
            </select>
          </label>
          <label>
            <span>한 줄 메모</span>
            <input
              maxLength={300}
              onChange={(event) => setNote(event.target.value)}
              placeholder="몸 상태나 잠들기 전 상황"
              value={note}
            />
          </label>
          <button
            className="submit-button"
            disabled={busy === 'sleep'}
            onClick={() => (sleep.data?.activeSleep ? void stopSleep() : void startSleep())}
            type="button"
          >
            {sleep.data?.activeSleep ? <><Square size={16} /> {busy === 'sleep' ? '기록 중…' : '수면 종료하기'}</> : <><BedDouble size={17} /> {busy === 'sleep' ? '시작 중…' : '수면 시작하기'}</>}
          </button>
        </div>
      </section>
      <section className="workspace-card history-card">
        <div className="section-title">
          <div>
            <p className="card-label">RECENT SLEEP</p>
            <h2>최근 수면</h2>
          </div>
        </div>
        <DataNotice
          loading={sleep.loading}
          error={sleep.error}
          onRetry={sleep.refresh}
        />
        <div className="record-list">
          {(sleep.data?.logs ?? []).filter((item) => item.woke_at).slice(0, 7).map((item) => {
            const hours =
              (new Date(item.woke_at!).getTime() -
                new Date(item.slept_at).getTime()) /
              3_600_000;
            return (
              <article className="record-row" key={item.id}>
                <div>
                  <strong>{hours.toFixed(1)}시간</strong>
                  <span>
                    {new Intl.DateTimeFormat('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      weekday: 'short',
                    }).format(new Date(item.woke_at!))}{' '}
                    · 만족도{' '}
                    {item.quality
                      ? qualityLabels[String(item.quality)]
                      : '기록 없음'}
                  </span>
                  {item.note && <small>{item.note}</small>}
                </div>
                <button
                  aria-label="수면 기록 삭제"
                  className="icon-button"
                  onClick={() => removeSleep(item.id)}
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </article>
            );
          })}
        </div>
        {!sleep.loading && !sleep.error && !sleep.data?.logs.length && (
          <DataNotice empty="기록이 쌓이면 평균 수면 시간을 보여드려요." />
        )}
      </section>
    </div>
  );
}
