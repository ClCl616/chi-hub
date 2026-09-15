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
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    await apiRequest('/api/calendar-events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, event_date: selected, notes }),
    });
    setTitle('');
    setNotes('');
    await data.refresh();
  };
  const remove = async (id: string) => {
    if (window.confirm('이 일정을 삭제할까요?')) {
      await apiRequest(`/api/calendar-events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await data.refresh();
    }
  };
  const shift = (amount: number) =>
    setCursor(
      (value) => new Date(value.getFullYear(), value.getMonth() + amount, 1),
    );
  return (
    <div className="calendar-layout">
      <section className="workspace-card calendar-board">
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
                onClick={() => setSelected(key)}
                key={key}
              >
                <time>{day.getDate()}</time>
                {items.slice(0, 2).map((item) => (
                  <span key={`${item.type}-${item.id}`}>{item.type}</span>
                ))}
              </button>
            );
          })}
        </div>
      </section>
      <aside className="workspace-card calendar-detail">
        <p className="card-label">SELECTED DAY</p>
        <h2>{selected}</h2>
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
                  aria-label="일정 삭제"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </article>
          ))}
        </div>
        <form className="stack-form" onSubmit={add}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="일정 추가"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="메모 (선택)"
          />
          <button className="submit-button">
            <Plus size={16} />
            일정 저장
          </button>
        </form>
      </aside>
    </div>
  );
}
