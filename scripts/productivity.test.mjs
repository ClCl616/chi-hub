import test from 'node:test';
import assert from 'node:assert/strict';
import { attachmentHeader } from '../lib/download.ts';
import { mealPeriod } from '../lib/campus-meals.ts';
import { reviewInterval } from '../lib/study.ts';

test('download header round-trips Korean, spaces, parentheses and Unicode filenames', () => {
  for (const name of [
    '강의 자료 (최종).pdf',
    "회의록 '수정' 100%.txt",
    '研究 📝.docx',
    'report.xlsx',
  ]) {
    const header = attachmentHeader(name);
    assert.match(
      header,
      /^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/,
    );
    assert.equal(decodeURIComponent(header.split("UTF-8''")[1]), name);
  }
  assert.ok(!attachmentHeader('bad\r\nX-Header: injected.txt').includes('\r'));
  assert.ok(!attachmentHeader('bad\r\nX-Header: injected.txt').includes('\n'));
});
test('meal grouping understands source variants without mislabelling combined meals', () => {
  assert.equal(mealPeriod('조식 (07:30~09:00)'), 'breakfast');
  assert.equal(mealPeriod('점심 / 학생식당'), 'lunch');
  assert.equal(mealPeriod('석식'), 'dinner');
  assert.equal(mealPeriod('중식·석식'), 'other');
  assert.equal(mealPeriod('운영 안내'), 'other');
});
test('review interval previews progress, reset and cap at 60 days', () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 6].map((stage) => reviewInterval(stage, 'good')),
    [1, 3, 7, 14, 30, 60, 60],
  );
  assert.equal(reviewInterval(4, 'again'), 1);
  assert.equal(reviewInterval(0, 'easy'), 3);
  assert.equal(reviewInterval(6, 'easy'), 60);
});
