'use client';

import { useMemo, useState } from 'react';
import { Dumbbell, Plus, Trash2 } from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';

type Workout = {
  id: string;
  title: string;
  workout_date: string;
  duration_minutes: number | null;
  note: string | null;
  created_at: string;
};
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export function WorkoutWorkspace() {
  const records = useApi<{ workouts: Workout[] }>('/api/workouts');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [duration, setDuration] = useState('30');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const stats = useMemo(() => {
    const items = records.data?.workouts ?? [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    const recent = items.filter(
      (item) => new Date(`${item.workout_date}T23:59:59`) >= cutoff,
    );
    return {
      count: recent.length,
      minutes: recent.reduce(
        (sum, item) => sum + (item.duration_minutes ?? 0),
        0,
      ),
    };
  }, [records.data]);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await apiRequest('/api/workouts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          date,
          durationMinutes: Number(duration),
          note,
        }),
      });
      setTitle('');
      setNote('');
      await records.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '저장하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm('이 운동 기록을 삭제할까요?')) return;
    try {
      await apiRequest(`/api/workouts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await records.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '삭제하지 못했습니다.',
      );
    }
  }
  return (
    <div className="workspace-grid workout-grid">
      <section className="workspace-card stats-strip">
        <div>
          <span>최근 7일</span>
          <strong>{stats.count}회</strong>
        </div>
        <div>
          <span>운동 시간</span>
          <strong>
            {Math.floor(stats.minutes / 60)}시간 {stats.minutes % 60}분
          </strong>
        </div>
        <div>
          <span>전체 기록</span>
          <strong>{records.data?.workouts.length ?? 0}개</strong>
        </div>
      </section>
      <section className="workspace-card form-card">
        <div className="section-title">
          <div>
            <p className="card-label">
              <Dumbbell size={16} /> NEW LOG
            </p>
            <h2>운동 기록하기</h2>
          </div>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label>
            <span>운동</span>
            <input
              maxLength={80}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 하체 근력 운동"
              required
              value={title}
            />
          </label>
          <div className="field-row">
            <label>
              <span>날짜</span>
              <input
                onChange={(event) => setDate(event.target.value)}
                required
                type="date"
                value={date}
              />
            </label>
            <label>
              <span>운동 시간(분)</span>
              <input
                max={1440}
                min={1}
                onChange={(event) => setDuration(event.target.value)}
                required
                type="number"
                value={duration}
              />
            </label>
          </div>
          <label>
            <span>메모</span>
            <textarea
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="운동 내용이나 컨디션을 남겨보세요"
              rows={4}
              value={note}
            />
          </label>
          {message && (
            <p className="form-message error" role="alert">
              {message}
            </p>
          )}
          <button className="submit-button" disabled={busy} type="submit">
            <Plus size={17} /> {busy ? '저장 중…' : '기록 저장'}
          </button>
        </form>
      </section>
      <section className="workspace-card history-card workout-history">
        <div className="section-title">
          <div>
            <p className="card-label">HISTORY</p>
            <h2>운동 기록</h2>
          </div>
        </div>
        <DataNotice
          loading={records.loading}
          error={records.error}
          onRetry={records.refresh}
        />
        <div className="record-list">
          {(records.data?.workouts ?? []).map((item) => (
            <article className="record-row" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>
                  {new Intl.DateTimeFormat('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }).format(new Date(`${item.workout_date}T12:00:00`))}{' '}
                  · {item.duration_minutes ?? 0}분
                </span>
                {item.note && <small>{item.note}</small>}
              </div>
              <button
                aria-label="운동 기록 삭제"
                className="icon-button"
                onClick={() => remove(item.id)}
                type="button"
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
        {!records.loading &&
          !records.error &&
          !records.data?.workouts.length && (
            <DataNotice empty="첫 운동을 기록하면 흐름을 확인할 수 있어요." />
          )}
      </section>
    </div>
  );
}
