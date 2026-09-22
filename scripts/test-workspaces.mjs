// Run against a local dev server with dummy Supabase configuration.
// Every /api request is intercepted; this test never writes production data.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:13002';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname))
  throw new Error('Only local test servers are allowed.');
await mkdir('work/qa', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  channel: process.env.TEST_BROWSER ?? 'chromium',
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  serviceWorkers: 'block',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('dialog', async (dialog) => {
  errors.push(`Unexpected browser dialog: ${dialog.message()}`);
  await dialog.dismiss();
});
const date = new Date().toISOString();
let notes = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    title: '기존 제목',
    content: '# 테스트 문서\n\n기존 내용',
    pinned: false,
    category: '개인',
    content_type: 'markdown',
    created_at: date,
    updated_at: date,
  },
];
let files = [
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: '검증 문서.txt',
    mime_type: 'text/plain',
    size_bytes: 1024,
    created_at: date,
    deleted_at: null,
    purge_started_at: null,
    url: null,
  },
];
const writes = [];
let failNextNote = false;
let failNextDelete = false;
const events = [];
const folders = [];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await context.route('**/api/**', async (route) => {
  const request = route.request(),
    url = new URL(request.url()),
    method = request.method();
  const reply = (body, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  if (url.pathname === '/api/auth/status')
    return reply({ user: { id: 'qa-user' } });
  if (url.pathname === '/api/notes') {
    if (method === 'GET') return reply({ notes });
    const body = request.postDataJSON();
    writes.push({ method, ...body });
    if (failNextNote) {
      failNextNote = false;
      return reply({ message: '테스트 저장 실패' }, 503);
    }
    await pause(700);
    const note = {
      ...body,
      content_type: body.contentType,
      created_at: date,
      updated_at: new Date().toISOString(),
    };
    notes = [note, ...notes.filter((item) => item.id !== note.id)];
    return reply({ note }, method === 'POST' ? 201 : 200);
  }
  if (url.pathname === '/api/folders') {
    if (method === 'GET') return reply({ folders });
    const body = request.postDataJSON();
    if (method === 'POST')
      folders.push({
        id: crypto.randomUUID(),
        name: body.name,
        parent_id: body.parent_id,
        deleted_at: null,
        trash_root_id: null,
      });
    else {
      const f = folders.find((f) => f.id === body.id);
      if (f) {
        if (method === 'DELETE') {
          f.deleted_at = date;
          f.trash_root_id = f.id;
        } else if (body.action === 'restore') {
          f.deleted_at = null;
          f.trash_root_id = null;
        } else f.name = body.name;
      }
    }
    return reply({ ok: true });
  }
  if (url.pathname === '/api/files') {
    if (method === 'GET')
      return reply({
        files: files.filter(
          (file) =>
            Boolean(file.deleted_at) ===
              (url.searchParams.get('trash') === 'true') &&
            (url.searchParams.get('trash') === 'true' ||
              (file.folder_id ?? null) === url.searchParams.get('folder')),
        ),
      });
    if (method === 'DELETE') {
      await pause(250);
      if (failNextDelete) {
        failNextDelete = false;
        return reply({ message: '테스트 이동 실패' }, 503);
      }
      files = files.map((file) =>
        file.id === url.searchParams.get('id')
          ? { ...file, deleted_at: new Date().toISOString() }
          : file,
      );
    }
    if (method === 'PATCH')
      files = files.map((file) =>
        file.id === request.postDataJSON().id
          ? request.postDataJSON().action === 'move'
            ? { ...file, folder_id: request.postDataJSON().folder_id }
            : { ...file, deleted_at: null }
          : file,
      );
    if (method === 'POST')
      files.push({
        id: crypto.randomUUID(),
        name: 'drop-test.txt',
        size_bytes: 4,
        mime_type: 'text/plain',
        created_at: date,
        deleted_at: null,
        purge_started_at: null,
        url: null,
      });
    return reply({ ok: true });
  }
  if (url.pathname === '/api/calendar') return reply({ records: [], events });
  if (url.pathname === '/api/calendar-events') {
    const body = request.postDataJSON();
    if (method === 'PATCH') {
      Object.assign(
        events.find((e) => e.id === body.id),
        body,
      );
    } else events.push({ ...body, id: 'qa-event' });
    return reply({ ok: true });
  }
  if (url.pathname === '/api/campus-meals')
    return reply({ message: 'QA에서 외부 학식 호출 생략' }, 503);
  return reply({
    sessions: [],
    logs: [],
    workouts: [],
    routines: [],
    checks: [],
    tasks: [],
    notes: [],
    files: [],
    records: [],
    events: [],
  });
});
const waitFor = async (predicate, message) => {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await pause(100);
  }
  throw new Error(message);
};
try {
  await page.goto(`${base}/?view=notes`);
  await page.getByRole('button', { name: /기존 제목/ }).click();
  await page.getByLabel('메모 제목', { exact: true }).fill('변경된 제목');
  await page.keyboard.press('Control+s');
  await waitFor(
    () => notes[0].title === '변경된 제목',
    'Existing note rename saved',
  );
  await page.getByRole('button', { name: '메모 목록으로' }).click();
  await page.getByRole('button', { name: /변경된 제목/ }).waitFor();
  assert.equal(notes.length, 1, 'Rename does not create a new note');
  await page.getByRole('button', { name: '메모 작성' }).click();
  await page.getByLabel('메모 제목', { exact: true }).fill('저장 경합 테스트');
  await page
    .getByRole('button', { name: 'Markdown 원문', exact: true })
    .click();
  await page
    .getByLabel('메모 내용', { exact: true })
    .fill(
      '# Markdown 제목\n\n**굵은 글씨**\n\n- [x] 완료\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n<script>window.qaXss=1</script>',
    );
  await page.keyboard.press('Control+s');
  await waitFor(
    () => writes.some((write) => write.method === 'POST'),
    'Create request started',
  );
  await page
    .getByLabel('메모 제목', { exact: true })
    .fill('저장 중 변경한 제목');
  await page.keyboard.press('Control+s');
  await waitFor(
    () => notes.some((note) => note.title === '저장 중 변경한 제목'),
    'Edits during POST saved by PATCH',
  );
  assert.equal(
    writes.filter((write) => write.method === 'POST').length,
    1,
    'Only one creation request',
  );
  assert.equal(notes.length, 2, 'Two distinct notes');
  await page.getByRole('button', { name: '읽기 모드' }).click();
  await page.locator('.markdown-body h1').waitFor();
  assert.equal(await page.locator('.markdown-body table').count(), 1);
  assert.equal(
    await page.locator('.markdown-body strong').innerText(),
    '굵은 글씨',
  );
  assert.equal(
    await page.evaluate(() => window.qaXss),
    undefined,
    'Raw HTML cannot execute',
  );
  await page.screenshot({ path: 'work/qa/notes-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '편집', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(350);
  assert.equal(
    await page.getByLabel('메모 제목', { exact: true }).inputValue(),
    '저장 중 변경한 제목',
    'Resize retains draft',
  );
  await page.screenshot({ path: 'work/qa/notes-mobile.png', fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    'No mobile horizontal overflow',
  );
  failNextNote = true;
  await page.getByLabel('메모 제목', { exact: true }).fill('실패 후 재시도');
  await page.keyboard.press('Control+s');
  await page.getByText('테스트 저장 실패', { exact: true }).waitFor();
  await page.keyboard.press('Control+s');
  await waitFor(
    () => notes.some((note) => note.title === '실패 후 재시도'),
    'Manual save retry',
  );
  await page.getByRole('button', { name: '서식 편집', exact: true }).click();
  await page.locator('.tiptap h1').waitFor();
  assert.equal(await page.locator('.tiptap table').count(), 1);
  await page.screenshot({
    path: 'work/qa/rich-notes-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await pause(350);
  await page.screenshot({
    path: 'work/qa/rich-notes-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(350);
  await page.getByLabel('서식 있는 메모 내용', { exact: true }).click();
  await page.getByLabel('서식 있는 메모 내용', { exact: true }).fill('/h2');
  await page.getByRole('menu', { name: '블록 명령' }).waitFor();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Rich heading');
  await page.keyboard.press('Control+s');
  await waitFor(
    () => notes.some((n) => n.content.includes('## Rich heading')),
    'Slash block persisted as Markdown',
  );
  await page.getByRole('button', { name: '메모 목록으로' }).click();
  await page.screenshot({ path: 'work/qa/library-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await pause(350);
  await page.screenshot({
    path: 'work/qa/library-desktop.png',
    fullPage: true,
  });
  await page.getByRole('tab', { name: '드라이브', exact: true }).click();
  await page
    .getByRole('button', { name: '검증 문서.txt 휴지통으로 이동' })
    .click();
  await page
    .getByText('휴지통으로 이동했습니다. 30일 동안 복원할 수 있습니다.')
    .waitFor();
  await page.getByRole('button', { name: '휴지통', exact: true }).click();
  await page.getByRole('button', { name: '검증 문서.txt 복원' }).click();
  await page.getByText('파일을 복원했습니다.').waitFor();
  await page
    .getByRole('button', { name: '내 드라이브', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: '검증 문서.txt 휴지통으로 이동' })
    .waitFor();
  failNextDelete = true;
  await page
    .getByRole('button', { name: '검증 문서.txt 휴지통으로 이동' })
    .click();
  await page.getByText('테스트 이동 실패').waitFor();
  await page
    .getByRole('button', { name: '검증 문서.txt 휴지통으로 이동' })
    .waitFor();
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer();
    data.items.add(new File(['test'], 'drop-test.txt', { type: 'text/plain' }));
    return data;
  });
  await page
    .locator('.drive-workspace')
    .dispatchEvent('drop', { dataTransfer: transfer });
  await page
    .locator('.drive-file-info strong')
    .filter({ hasText: 'drop-test.txt' })
    .waitFor();
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await page.getByRole('menuitem', { name: '폴더 추가', exact: true }).click();
  await page.getByLabel('폴더 이름', { exact: true }).fill('자료');
  await page.getByRole('button', { name: '폴더 저장' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '자료', exact: true }).click();
  await page.getByRole('heading', { name: '자료', exact: true }).waitFor();
  assert.equal(await page.locator('.drive-item').count(), 0);
  await page.getByRole('button', { name: '추가', exact: true }).click();
  await page.getByRole('menuitem', { name: '폴더 추가' }).click();
  await page.getByLabel('폴더 이름', { exact: true }).fill('하위 폴더');
  await page.getByRole('button', { name: '폴더 저장' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(folders[1].parent_id, folders[0].id);
  await page
    .getByRole('button', { name: '내 드라이브', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: '검증 문서.txt 이동', exact: true })
    .click();
  await page
    .getByLabel('이동할 폴더', { exact: true })
    .selectOption(folders[0].id);
  await page.getByRole('button', { name: '이동', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '자료', exact: true }).click();
  await page
    .getByRole('button', { name: '검증 문서.txt 이동', exact: true })
    .waitFor();
  await page.screenshot({ path: 'work/qa/drive-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(350);
  await page.screenshot({ path: 'work/qa/drive-mobile.png', fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    'Drive fits mobile',
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await pause(350);
  await page.getByRole('tab', { name: '캘린더', exact: true }).click();
  assert.equal(await page.locator('.calendar-detail').count(), 0);
  await page.locator('.calendar-day:not(.outside)').first().click();
  await page.getByRole('dialog').waitFor();
  await page.getByLabel('일정 제목').fill('팝업 일정');
  await page.getByLabel('일정 반복').selectOption('weekly');
  await page.getByLabel('일정 장소').fill('회의실');
  await page.getByRole('button', { name: '일정 저장', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(events.length, 1);
  assert.ok(
    (await page.locator('.calendar-event-chip').count()) > 1,
    'Recurring instances displayed',
  );
  await page.getByRole('button', { name: '주', exact: true }).click();
  assert.equal(await page.locator('.calendar-day').count(), 7);
  await page.getByRole('button', { name: '일정 목록', exact: true }).click();
  await page.locator('.agenda-day').first().click();
  await page.getByRole('button', { name: '팝업 일정 수정' }).click();
  await page.getByLabel('일정 제목').fill('수정 일정');
  await page.getByRole('button', { name: '변경 저장' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(events[0].title, '수정 일정');
  await page.getByRole('button', { name: '월', exact: true }).click();
  await page.screenshot({
    path: 'work/qa/calendar-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(350);
  await page.locator('.calendar-day:not(.outside)').first().click();
  await page.screenshot({
    path: 'work/qa/calendar-mobile.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await pause(350);
    for (const view of [
      'focus',
      'morning',
      'calendar',
      'notes',
      'sleep',
      'workouts',
      'files',
      'meals',
    ]) {
      await page.goto(base + '/?view=' + view);
      await page.locator('.tab-view:visible').first().waitFor();
      await pause(150);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        'No overflow: ' + view + ' ' + width,
      );
    }
  }
  assert.deepEqual(
    errors,
    [],
    'No browser errors or native confirmation dialogs',
  );
  console.log(
    'PASS: note rename, single-flight creation, Ctrl+S, retry, Markdown/XSS, viewport state, drive trash/restore/failure rollback/drop upload, calendar dialog and responsive layouts.',
  );
} catch (error) {
  console.error('Browser errors:', errors);
  console.error((await page.locator('body').innerText()).slice(0, 2500));
  await page.screenshot({ path: 'work/qa/failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
}
