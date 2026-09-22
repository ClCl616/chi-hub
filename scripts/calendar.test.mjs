import test from 'node:test';
import assert from 'node:assert/strict';
import { occursOn, eventInput, validDate } from '../lib/calendar.ts';
const base = {
  id: 'test',
  title: 'test',
  event_date: '2024-01-31',
  notes: '',
  all_day: true,
  start_time: null,
  end_time: null,
  color: '#6b8e23',
  location: '',
  repeat: 'monthly',
  repeat_until: null,
};
test('monthly skips unavailable dates without drifting', () => {
  assert.equal(occursOn(base, '2024-02-29'), false);
  assert.equal(occursOn(base, '2024-03-31'), true);
  assert.equal(occursOn(base, '2023-12-31'), false);
});
test('yearly leap day and inclusive recurrence end', () => {
  const leap = {
    ...base,
    event_date: '2024-02-29',
    repeat: 'yearly',
    repeat_until: '2028-02-29',
  };
  assert.equal(occursOn(leap, '2025-02-28'), false);
  assert.equal(occursOn(leap, '2028-02-29'), true);
  assert.equal(occursOn(leap, '2032-02-29'), false);
});
test('invalid calendar dates and reversed times rejected', () => {
  assert.equal(validDate('2026-02-30'), false);
  assert.throws(() =>
    eventInput({
      ...base,
      all_day: false,
      start_time: '13:00',
      end_time: '12:00',
    }),
  );
  assert.throws(() => eventInput({ ...base, repeat_until: '2023-12-01' }));
  assert.equal(eventInput(base).repeat, 'monthly');
});
