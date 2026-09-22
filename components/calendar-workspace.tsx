'use client';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';
import { WorkspaceDialog } from '@/components/workspace-dialog';
type RecordItem = {
  id: string;
  date: string;
  type: string;
  title: string;
  detail: string;
};
const iso = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
const today = () => iso(new Date());
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
export function CalendarWorkspace() {
  const data = useApi<{ records: RecordItem[] }>('/api/calendar');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(today());
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1),
      start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);
  const records = data.data?.records ?? [];
  const selectedRecords = records.filter((item) => item.date === selected);
  const add = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/calendar-events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, event_date: selected, notes }),
      });
      setTitle('');
      setNotes('');
      await data.refresh();
      setOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '저장하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/api/calendar-events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await data.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '삭제하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  };
  const shift = (amount: number) =>
    setCursor(
      (value) => new Date(value.getFullYear(), value.getMonth() + amount, 1),
    );
  return (
    <div className="calendar-layout">
      <section className="workspace-card calendar-board">
        <DataNotice
          loading={data.loading}
          error={data.error}
          onRetry={data.refresh}
        />
        <div className="calendar-title">
          <button onClick={() => shift(-1)} aria-label="이전 달">
            <ChevronLeft size={18} />
          </button>
          <div>
            <p className="card-label">
              <CalendarDays size={16} /> CALENDAR
            </p>
            <h2>
              {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
            </h2>
          </div>
          <button onClick={() => shift(1)} aria-label="다음 달">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="calendar-weekdays">
          {weekdays.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map((day) => {
            const key = iso(day),
              items = records.filter((item) => item.date === key),
              outside = day.getMonth() !== cursor.getMonth();
            return (
              <button
                className={`calendar-day ${selected === key ? 'selected' : ''} ${outside ? 'outside' : ''}`}
                onClick={() => {
                  setSelected(key);
                  setTitle('');
                  setNotes('');
                  setError('');
                  setOpen(true);
                }}
                aria-label={`${key}, ${items.length}개 기록, 일정 추가`}
                key={key}
              >
                <time>{day.getDate()}</time>
                {items.slice(0, 2).map((item) => (
                  <span key={`${item.type}-${item.id}`}>{item.title}</span>
                ))}
                {items.length > 2 && <small>+{items.length - 2}</small>}
              </button>
            );
          })}
        </div>
      </section>
      <WorkspaceDialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title={selected}
        description="이 날짜의 기록을 확인하고 새 일정을 추가하세요."
      >
        <DataNotice
          loading={data.loading}
          error={data.error}
          onRetry={data.refresh}
        />
        <div className="record-list">
          {selectedRecords.map((item) => (
            <article className="record-row" key={`${item.type}-${item.id}`}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.type}</span>
                {item.detail && <small>{item.detail}</small>}
              </div>
              {item.type === '일정' && (
                <button
                  className="icon-button"
                  onClick={() => void remove(item.id)}
                  disabled={busy}
                  aria-label="일정 삭제"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </article>
          ))}
        </div>
        <form
          className="stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <input
            aria-label="일정 제목"
            required
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="일정 추가"
          />
          <input
            aria-label="일정 메모"
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="메모 (선택)"
          />
          <button className="submit-button" disabled={busy}>
            <Plus size={16} />
            {busy ? '처리 중…' : '일정 저장'}
          </button>
        </form>
        {error && <p role="alert">{error}</p>}
      </WorkspaceDialog>
    </div>
  );
}
