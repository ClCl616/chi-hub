export type CalendarEvent = {
  id: string;
  title: string;
  event_date: string;
  notes: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  color: string;
  location: string;
  repeat: string;
  repeat_until: string | null;
};
export const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const validDate = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
export function occursOn(event: CalendarEvent, day: string) {
  if (
    day < event.event_date ||
    (event.repeat_until && day > event.repeat_until)
  )
    return false;
  const start = new Date(event.event_date + 'T00:00:00Z'),
    current = new Date(day + 'T00:00:00Z');
  switch (event.repeat) {
    case 'daily':
      return true;
    case 'weekly':
      return start.getUTCDay() === current.getUTCDay();
    case 'monthly':
      return start.getUTCDate() === current.getUTCDate();
    case 'yearly':
      return (
        start.getUTCMonth() === current.getUTCMonth() &&
        start.getUTCDate() === current.getUTCDate()
      );
    default:
      return day === event.event_date;
  }
}
export function eventInput(body: Record<string, unknown>) {
  if (
    typeof body.title !== 'string' ||
    !body.title.trim() ||
    !validDate(body.event_date)
  )
    throw new Error('일정 제목과 올바른 날짜를 입력해주세요.');
  const all_day = body.all_day !== false;
  const time = (value: unknown) =>
    typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
      ? value
      : null;
  const start_time = all_day ? null : time(body.start_time),
    end_time = all_day ? null : time(body.end_time);
  if (!all_day && (!start_time || !end_time || end_time <= start_time))
    throw new Error('종료 시간은 시작 시간 이후로 설정해주세요.');
  const repeat =
    typeof body.repeat === 'string' &&
    ['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(body.repeat)
      ? body.repeat
      : 'none';
  const repeat_until =
    repeat !== 'none' && body.repeat_until ? body.repeat_until : null;
  if (
    repeat_until &&
    (!validDate(repeat_until) || repeat_until < body.event_date)
  )
    throw new Error('반복 종료일을 확인해주세요.');
  return {
    title: body.title.trim().slice(0, 100),
    event_date: body.event_date,
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : '',
    all_day,
    start_time,
    end_time,
    color:
      typeof body.color === 'string' && /^#[\da-f]{6}$/i.test(body.color)
        ? body.color
        : '#6b8e23',
    location:
      typeof body.location === 'string'
        ? body.location.trim().slice(0, 200)
        : '',
    repeat,
    repeat_until,
  };
}
