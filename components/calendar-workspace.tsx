'use client';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';
import { WorkspaceDialog } from '@/components/workspace-dialog';
import { type CalendarEvent, dateKey, occursOn } from '@/lib/calendar';
type RecordItem = {
  id: string;
  date: string;
  type: string;
  title: string;
  detail: string;
  event?: CalendarEvent;
};
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const repeats = [
  ['none', '반복 안 함'],
  ['daily', '매일'],
  ['weekly', '매주'],
  ['monthly', '매월'],
  ['yearly', '매년'],
];
const fresh = (date: string): CalendarEvent => ({
  id: '',
  title: '',
  event_date: date,
  notes: '',
  all_day: true,
  start_time: '09:00',
  end_time: '10:00',
  color: '#6b8e23',
  location: '',
  repeat: 'none',
  repeat_until: null,
});
export function CalendarWorkspace() {
  const data = useApi<{ records: RecordItem[]; events: CalendarEvent[] }>(
    '/api/calendar',
  );
  const [cursor, setCursor] = useState(() => new Date()),
    [selected, setSelected] = useState(() => dateKey(new Date()));
  const [view, setView] = useState('month'),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('전체');
  const [draft, setDraft] = useState(() => fresh(selected)),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const patch = (value: Partial<CalendarEvent>) =>
    setDraft((d) => ({ ...d, ...value }));
  const days = useMemo(() => {
    const start = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      view === 'week' ? cursor.getDate() : 1,
    );
    if (view !== 'agenda') start.setDate(start.getDate() - start.getDay());
    const count =
      view === 'week'
        ? 7
        : view === 'agenda'
          ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
          : 42;
    return Array.from(
      { length: count },
      (_, i) =>
        new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
    );
  }, [cursor, view]);
  const itemsOn = (day: string): RecordItem[] => {
    const events = data.data?.events;
    const base = (data.data?.records ?? []).filter(
      (r) => r.date === day && (!events || r.type !== '일정'),
    );
    return [
      ...base,
      ...(events ?? [])
        .filter((e) => occursOn(e, day))
        .map((e) => ({
          id: e.id,
          date: day,
          type: '일정',
          title: e.title,
          detail: [
            e.all_day
              ? '종일'
              : `${e.start_time?.slice(0, 5)}–${e.end_time?.slice(0, 5)}`,
            e.location,
            e.notes,
          ]
            .filter(Boolean)
            .join(' · '),
          event: e,
        })),
    ]
      .filter(
        (r) =>
          (category === '전체' || r.type === category) &&
          `${r.title} ${r.detail}`.toLowerCase().includes(query.toLowerCase()),
      )
      .sort((a, b) =>
        (a.event?.start_time ?? '').localeCompare(b.event?.start_time ?? ''),
      );
  };
  const show = (date: string) => {
    setSelected(date);
    setDraft(fresh(date));
    setError('');
    setOpen(true);
  };
  const shift = (amount: number) =>
    setCursor((v) =>
      view === 'week'
        ? new Date(v.getFullYear(), v.getMonth(), v.getDate() + amount * 7)
        : new Date(v.getFullYear(), v.getMonth() + amount, 1),
    );
  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await apiRequest('/api/calendar-events', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(draft),
      });
      await data.refresh();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/api/calendar-events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await data.refresh();
      if (draft.id === id) setDraft(fresh(selected));
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="calendar-layout">
      <section className="workspace-card calendar-board calendar-expanded">
        <DataNotice
          loading={data.loading}
          error={data.error}
          onRetry={data.refresh}
        />
        <header className="calendar-heading">
          <div>
            <p className="card-label">
              <CalendarDays size={16} /> CALENDAR
            </p>
            <h2>
              {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
            </h2>
          </div>
          <div className="calendar-navigation">
            <button aria-label="이전 기간" onClick={() => shift(-1)}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setCursor(new Date())}>오늘</button>
            <button aria-label="다음 기간" onClick={() => shift(1)}>
              <ChevronRight size={18} />
            </button>
            <input
              type="date"
              aria-label="날짜로 이동"
              value={dateKey(cursor)}
              onChange={(e) => {
                if (e.target.value)
                  setCursor(new Date(e.target.value + 'T12:00:00'));
              }}
            />
          </div>
        </header>
        <div className="calendar-tools">
          <div className="view-switch">
            {[
              ['month', '월'],
              ['week', '주'],
              ['agenda', '일정 목록'],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={view === id}
                onClick={() => setView(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="일정 검색"
              placeholder="일정 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="기록 종류"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {['전체', '일정', '루틴', '할 일', '수면', '타이머'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
        {view !== 'agenda' && (
          <div className="calendar-weekdays">
            {weekdays.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        )}
        <div
          className={
            view === 'agenda'
              ? 'calendar-agenda'
              : `calendar-grid ${view === 'week' ? 'week-view' : ''}`
          }
        >
          {days.map((day) => {
            const key = dateKey(day),
              items = itemsOn(key);
            if (view === 'agenda' && !items.length) return null;
            return (
              <button
                key={key}
                className={`calendar-day ${view === 'agenda' ? 'agenda-day' : ''} ${key === dateKey(new Date()) ? 'is-today' : ''} ${selected === key ? 'selected' : ''} ${day.getMonth() !== cursor.getMonth() ? 'outside' : ''}`}
                onClick={() => show(key)}
                aria-label={`${key}, ${items.length}개 기록, 일정 추가`}
              >
                <time dateTime={key}>
                  {view === 'agenda'
                    ? `${day.getDate()}일 (${weekdays[day.getDay()]})`
                    : day.getDate()}
                </time>
                {items.slice(0, view === 'month' ? 3 : 20).map((item) => (
                  <span
                    className="calendar-event-chip"
                    style={{ borderLeftColor: item.event?.color ?? '#a2a69c' }}
                    key={`${item.type}-${item.id}`}
                  >
                    {item.event && !item.event.all_day && (
                      <small>{item.event.start_time?.slice(0, 5)} </small>
                    )}
                    {item.title}
                  </span>
                ))}
                {items.length > (view === 'month' ? 3 : 20) && (
                  <small>+{items.length - (view === 'month' ? 3 : 20)}</small>
                )}
              </button>
            );
          })}
        </div>
        {view === 'agenda' &&
          !days.some((day) => itemsOn(dateKey(day)).length) && (
            <div className="calendar-empty">
              <p>표시할 일정이 없습니다.</p>
              <button
                className="submit-button"
                onClick={() => show(dateKey(cursor))}
              >
                <Plus size={16} />
                일정 추가
              </button>
            </div>
          )}
        <p className="calendar-tip">
          날짜를 누르면 기록 확인과 일정 추가가 가능합니다.
        </p>
      </section>
      <WorkspaceDialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
        title={`${selected} 일정`}
        description="시간과 장소, 반복 주기를 설정하세요."
      >
        <div className="record-list">
          {itemsOn(selected).map((item) => (
            <article className="record-row" key={`${item.type}-${item.id}`}>
              <div>
                <strong>{item.title}</strong>
                <span>{item.type}</span>
                <small>{item.detail}</small>
              </div>
              {item.type === '일정' && (
                <>
                  <button
                    className="icon-button"
                    aria-label={`${item.title} 수정`}
                    disabled={busy}
                    onClick={() => {
                      if (item.event)
                        setDraft({
                          ...item.event,
                          start_time:
                            item.event.start_time?.slice(0, 5) ?? '09:00',
                          end_time: item.event.end_time?.slice(0, 5) ?? '10:00',
                        });
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="일정 삭제"
                    disabled={busy}
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </article>
          ))}
        </div>
        <form
          className="stack-form event-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <input
            aria-label="일정 제목"
            required
            maxLength={100}
            placeholder="일정 제목"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <label>
            날짜
            <input
              type="date"
              required
              aria-label="일정 날짜"
              value={draft.event_date}
              onChange={(e) => patch({ event_date: e.target.value })}
            />
          </label>
          <label className="inline-check">
            <input
              type="checkbox"
              checked={draft.all_day}
              onChange={(e) => patch({ all_day: e.target.checked })}
            />
            종일
          </label>
          {!draft.all_day && (
            <div className="event-time-row">
              <label>
                시작
                <input
                  aria-label="시작 시간"
                  type="time"
                  required
                  value={draft.start_time ?? ''}
                  onChange={(e) => patch({ start_time: e.target.value })}
                />
              </label>
              <label>
                종료
                <input
                  aria-label="종료 시간"
                  type="time"
                  required
                  value={draft.end_time ?? ''}
                  onChange={(e) => patch({ end_time: e.target.value })}
                />
              </label>
            </div>
          )}
          <input
            aria-label="일정 장소"
            placeholder="장소"
            maxLength={200}
            value={draft.location}
            onChange={(e) => patch({ location: e.target.value })}
          />
          <input
            aria-label="일정 메모"
            placeholder="메모 (선택)"
            maxLength={500}
            value={draft.notes ?? ''}
            onChange={(e) => patch({ notes: e.target.value })}
          />
          <div className="event-time-row">
            <label>
              반복
              <select
                aria-label="일정 반복"
                value={draft.repeat}
                onChange={(e) => patch({ repeat: e.target.value })}
              >
                {repeats.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              색상
              <input
                type="color"
                aria-label="일정 색상"
                value={draft.color}
                onChange={(e) => patch({ color: e.target.value })}
              />
            </label>
          </div>
          {draft.repeat !== 'none' && (
            <>
              <label>
                반복 종료일 (비워두면 계속)
                <input
                  type="date"
                  min={draft.event_date}
                  aria-label="반복 종료일"
                  value={draft.repeat_until ?? ''}
                  onChange={(e) =>
                    patch({ repeat_until: e.target.value || null })
                  }
                />
              </label>
              <small>
                반복 일정은 전체가 함께 수정·삭제됩니다. 해당 날짜가 없는 달은
                건너뜁니다.
              </small>
            </>
          )}
          <button className="submit-button" disabled={busy}>
            <Plus size={16} />
            {busy ? '처리 중…' : draft.id ? '변경 저장' : '일정 저장'}
          </button>
          {draft.id && (
            <button type="button" onClick={() => setDraft(fresh(selected))}>
              새 일정 작성
            </button>
          )}
        </form>
        {error && <p role="alert">{error}</p>}
      </WorkspaceDialog>
    </div>
  );
}
