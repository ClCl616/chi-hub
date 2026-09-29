// Run against a local dev server with dummy Supabase configuration.
// Every /api request is intercepted; this test never writes production data.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { attachmentHeader } from '../lib/download.ts';
import { reviewInterval } from '../lib/study.ts';

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
  hasTouch: true,
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
    pinned: true,
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
let failNextNoteDelete = false;
let failNextDelete = false;
const events = [];
const folders = [];
let studyItems = [];
const studyReviews = [];
let failNextRestore = false;
// Edge may re-request a download outside Playwright interception. Serve actual
// bytes locally so that second request cannot reach the unauthenticated app API.
const downloadServer = createServer((request, response) => {
  const file = files.find(
    (item) =>
      item.id ===
      new URL(request.url, 'http://localhost').searchParams.get('id'),
  );
  if (!file) {
    response.writeHead(404);
    response.end();
    return;
  }
  response.writeHead(200, {
    'content-type': 'application/octet-stream',
    'content-disposition': attachmentHeader(file.name),
    'cache-control': 'no-store',
  });
  response.end('download verification');
});
downloadServer.listen(0, '127.0.0.1');
await once(downloadServer, 'listening');
const downloadBase = `http://127.0.0.1:${downloadServer.address().port}`;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fileCard = (name) =>
  page.locator('.drive-item').filter({ hasText: name });
async function fileAction(name, action) {
  await fileCard(name).click({ button: 'right' });
  await page.getByRole('menuitem', { name: action, exact: true }).click();
}
async function longPress(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 60) },
    ],
  });
  await pause(850);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await session.detach();
}

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
    if (method === 'GET')
      return reply({
        notes: notes.filter(
          (note) =>
            Boolean(note.deleted_at) ===
            (url.searchParams.get('trash') === 'true'),
        ),
      });
    if (method === 'DELETE') {
      if (failNextNoteDelete) {
        failNextNoteDelete = false;
        return reply({ message: '메모 삭제 테스트 오류' }, 503);
      }
      notes = notes.map((note) =>
        note.id === url.searchParams.get('id')
          ? { ...note, deleted_at: new Date().toISOString() }
          : note,
      );
      return reply({ ok: true });
    }
    const body = request.postDataJSON();
    if (body.action === 'restore') {
      if (failNextRestore) {
        failNextRestore = false;
        return reply({ message: '복원 테스트 오류' }, 503);
      }
      const note = notes.find((item) => item.id === body.id);
      note.deleted_at = null;
      return reply({ note });
    }
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
  if (url.pathname === '/api/study') {
    if (method === 'GET') {
      const scope = url.searchParams.get('scope');
      const filtered = studyItems.filter(
        (item) =>
          item.archived === (scope === 'archived') &&
          (scope !== 'today' ||
            item.due_date <= url.searchParams.get('today')) &&
          item.title.includes(url.searchParams.get('q') ?? ''),
      );
      return reply({
        items: filtered,
        total: filtered.length,
        reviews: studyReviews,
      });
    }
    const body = request.postDataJSON();
    await pause(200);
    if (method === 'POST') {
      const item = {
        ...body,
        stage: 0,
        review_count: 0,
        archived: false,
        updated_at: new Date().toISOString(),
      };
      studyItems = [
        item,
        ...studyItems.filter((entry) => entry.id !== item.id),
      ];
      return reply({ item }, 201);
    }
    const item = studyItems.find((entry) => entry.id === body.id);
    if (body.action === 'review') {
      if (!studyReviews.some((r) => r.id === body.request_id)) {
        const next = new Date(body.reviewed_on + 'T12:00:00Z');
        next.setUTCDate(
          next.getUTCDate() + reviewInterval(item.stage, body.rating),
        );
        item.stage =
          body.rating === 'again'
            ? 0
            : Math.min(6, item.stage + (body.rating === 'easy' ? 2 : 1));
        item.review_count++;
        item.due_date = next.toISOString().slice(0, 10);
        studyReviews.push({
          id: body.request_id,
          item_id: item.id,
          rating: body.rating,
          reviewed_on: body.reviewed_on,
          next_due_date: item.due_date,
        });
      }
    } else Object.assign(item, body);
    item.updated_at = new Date().toISOString();
    return reply({ item });
  }
  if (url.pathname === '/api/files/download') {
    return route.continue({ url: downloadBase + url.pathname + url.search });
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
    return reply({
      university: { id: 'dju', name: '대전대학교' },
      weekLabel: '테스트 주간',
      sourceUrl: 'https://www.dju.ac.kr',
      dates: [{ date: date.slice(0, 10), label: '9.29 화' }],
      meals: ['조식', '중식', '석식'].map((mealType) => ({
        date: date.slice(0, 10),
        cafeteria: '혜화문화관',
        mealType,
        menu: [mealType + ' 메뉴', '밥', '국'],
      })),
    });
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
  await page.locator('.note-tile').filter({ hasText: '기존 제목' }).click();
  await page.getByLabel('메모 제목', { exact: true }).fill('변경된 제목');
  await page.keyboard.press('Control+s');
  await waitFor(
    () => notes[0].title === '변경된 제목',
    'Existing note rename saved',
  );
  await page.getByRole('button', { name: '메모 목록으로' }).click();
  await page.locator('.note-tile').filter({ hasText: '변경된 제목' }).waitFor();
  assert.equal(notes.length, 1, 'Rename does not create a new note');
  const pin = page.locator('.note-pin');
  const pinBox = await pin.boundingBox();
  const previewBox = await page.locator('.note-paper').first().boundingBox();
  assert.ok(
    pinBox.x >= previewBox.x &&
      pinBox.x < previewBox.x + 20 &&
      pinBox.y >= previewBox.y &&
      pinBox.y < previewBox.y + 20,
    'Pin overlays top-left of preview',
  );
  await page.screenshot({ path: 'work/qa/note-pin.png', fullPage: true });
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
  await fileAction('검증 문서.txt', '삭제');
  await page
    .getByText('휴지통으로 이동했습니다. 30일 동안 복원할 수 있습니다.')
    .waitFor();
  await page.getByRole('button', { name: '휴지통', exact: true }).click();
  await fileAction('검증 문서.txt', '복원');
  await page.getByText('파일을 복원했습니다.').waitFor();
  await page
    .getByRole('button', { name: '내 드라이브', exact: true })
    .first()
    .click();
  await fileCard('검증 문서.txt').waitFor();
  failNextDelete = true;
  await fileAction('검증 문서.txt', '삭제');
  await page.getByText('테스트 이동 실패').waitFor();
  await fileCard('검증 문서.txt').waitFor();
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
  await fileAction('검증 문서.txt', '이동');
  await page
    .getByLabel('이동할 폴더', { exact: true })
    .selectOption(folders[0].id);
  await page.getByRole('button', { name: '이동', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '자료', exact: true }).click();
  await fileCard('검증 문서.txt').waitFor();
  await page.screenshot({ path: 'work/qa/drive-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(350);
  await page.screenshot({ path: 'work/qa/drive-mobile.png', fullPage: true });
  await longPress(fileCard('검증 문서.txt'));
  await page.getByRole('menuitem', { name: '삭제', exact: true }).waitFor();
  await page.screenshot({
    path: 'work/qa/drive-context-mobile.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await page.getByRole('menu').waitFor({ state: 'hidden' });
  await page
    .getByRole('button', { name: '파일 목록 보기', exact: true })
    .click();
  await fileCard('검증 문서.txt').click({ button: 'right' });
  await page.getByRole('menuitem', { name: '다운로드', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('menu').waitFor({ state: 'hidden' });
  await page
    .getByRole('button', { name: '파일 격자 보기', exact: true })
    .click();
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
  await page.setViewportSize({ width: 1440, height: 1000 });
  await pause(350);
  await page.goto(base + '/?view=notes');
  const savedNote = notes[0];
  await page.locator('.note-tile').filter({ hasText: savedNote.title }).click();
  assert.equal(
    await page.getByRole('button', { name: '메모 삭제', exact: true }).count(),
    0,
  );
  await page.getByRole('button', { name: '메모 목록으로' }).click();
  await page
    .locator('.note-tile')
    .filter({ hasText: savedNote.title })
    .click({ button: 'right' });
  await page.getByRole('menuitem', { name: '삭제', exact: true }).click();
  await page
    .locator('.note-tile')
    .filter({ hasText: savedNote.title })
    .waitFor({ state: 'hidden' });
  assert.ok(notes.find((item) => item.id === savedNote.id).deleted_at);
  await page
    .locator('.notes-categories')
    .getByRole('button', { name: /휴지통/ })
    .click();
  await page.locator('.note-tile').first().click();
  failNextRestore = true;
  await page.getByRole('button', { name: '메모 복원', exact: true }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: '복원 테스트 오류' })
    .waitFor();
  assert.ok(
    notes.find((item) => item.id === savedNote.id).deleted_at,
    'Failed restore leaves the note in trash',
  );
  await page.getByRole('button', { name: '메모 복원', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(notes.find((item) => item.id === savedNote.id).deleted_at, null);
  assert.equal(
    notes.find((item) => item.id === savedNote.id).content,
    savedNote.content,
  );
  await page.screenshot({
    path: 'work/qa/notes-trash-desktop.png',
    fullPage: true,
  });

  // Right-click targets the clicked card, even after another note was edited.
  await page
    .locator('.notes-categories')
    .getByRole('button', { name: /^전체/ })
    .click();
  await page.locator('.note-tile').filter({ hasText: savedNote.title }).click();
  await page.getByRole('button', { name: '메모 목록으로' }).click();
  const contextNote = notes.find((note) => note.id !== savedNote.id);
  const contextTile = page
    .locator('.note-tile')
    .filter({ hasText: contextNote.title });
  await contextTile.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '삭제', exact: true }).waitFor();
  await page.keyboard.press('Alt+9');
  assert.ok(
    page.url().includes('view=notes'),
    'Context menu blocks global navigation',
  );
  await page.screenshot({
    path: 'work/qa/notes-context-menu.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await page.getByRole('menu').waitFor({ state: 'hidden' });
  await contextTile.click({ button: 'right' });
  const headingBox = await page.locator('h1').boundingBox();
  await page.mouse.click(headingBox.x + 5, headingBox.y + 5);
  await page.getByRole('menu').waitFor({ state: 'hidden' });
  await contextTile.click({ button: 'right' });
  failNextNoteDelete = true;
  await page.getByRole('menuitem', { name: '삭제', exact: true }).click();
  await page
    .getByRole('alert')
    .filter({ hasText: '메모 삭제 테스트 오류' })
    .waitFor();
  assert.ok(
    !notes.find((note) => note.id === contextNote.id).deleted_at,
    'Failed deletion preserves note',
  );
  await contextTile.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '삭제', exact: true }).click();
  await contextTile.waitFor({ state: 'hidden' });
  assert.ok(notes.find((note) => note.id === contextNote.id).deleted_at);
  assert.ok(
    !notes.find((note) => note.id === savedNote.id).deleted_at,
    'Previously edited note is unchanged',
  );
  await page
    .locator('.notes-categories')
    .getByRole('button', { name: /휴지통/ })
    .click();
  await contextTile.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '복원', exact: true }).click();
  await contextTile.waitFor({ state: 'hidden' });
  assert.equal(
    notes.find((note) => note.id === contextNote.id).deleted_at,
    null,
  );
  await page
    .locator('.notes-categories')
    .getByRole('button', { name: /^전체/ })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(350);
  assert.equal(await page.locator('.note-more').count(), 0);
  await longPress(contextTile);
  await page.getByRole('menuitem', { name: '삭제', exact: true }).waitFor();
  await page.screenshot({
    path: 'work/qa/notes-menu-mobile.png',
    fullPage: true,
  });
  await page.getByRole('menuitem', { name: '열기', exact: true }).click();
  await page.getByLabel('메모 제목', { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel('메모 제목', { exact: true }).inputValue(),
    contextNote.title,
  );
  assert.equal(
    await page
      .locator('.markdown-toolbar')
      .getByText('Ctrl', { exact: false })
      .count(),
    0,
  );
  await page.getByRole('button', { name: '메모 목록으로' }).click();
  await page.getByRole('button', { name: '전체 메뉴 열기' }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: '설정', exact: true })
    .click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page
    .getByRole('heading', { name: '키보드 단축키', exact: true })
    .waitFor();
  await page.screenshot({
    path: 'work/qa/settings-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await pause(350);
  await page.getByRole('tab', { name: '메모', exact: true }).click();
  await page.locator('h1').click();
  await page.keyboard.press('F1');
  await page
    .getByRole('heading', { name: '키보드 단축키', exact: true })
    .waitFor();
  assert.ok(page.url().includes('view=settings'));
  assert.equal(await page.locator('.workspace-shortcuts-button').count(), 0);
  await page.screenshot({
    path: 'work/qa/settings-desktop.png',
    fullPage: true,
  });

  await page.keyboard.press('Control+k');
  await page.getByLabel('작업 검색').fill('복습');
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: '조금씩, 오래 기억하기' }).waitFor();
  await page.locator('h1').click();
  await page.keyboard.press('Alt+n');
  await page.getByLabel('학습 제목', { exact: true }).fill('운영체제 복습');
  await page.getByLabel('과목', { exact: true }).fill('컴퓨터공학');
  await page
    .getByLabel('학습 내용', { exact: true })
    .fill('프로세스와 스레드의 차이를 설명하기');
  await page.getByRole('button', { name: '학습 저장' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(studyItems.length, 1);
  await page.screenshot({ path: 'work/qa/study-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '복습하기', exact: true }).click();
  assert.equal(
    await page
      .getByText('프로세스와 스레드의 차이를 설명하기', { exact: true })
      .count(),
    0,
    'Recall before reveal',
  );
  await page.getByRole('button', { name: '내용 확인' }).click();
  await page
    .getByText('프로세스와 스레드의 차이를 설명하기', { exact: true })
    .waitFor();
  await page.screenshot({
    path: 'work/qa/study-review-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: /기억했어요/ }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(studyItems[0].review_count, 1);
  await page.getByText('오늘 복습을 모두 마쳤어요', { exact: true }).waitFor();
  await page.getByRole('button', { name: '전체 학습', exact: true }).click();
  await page
    .getByRole('button', { name: '운영체제 복습 수정', exact: true })
    .click();
  await page
    .getByLabel('학습 제목', { exact: true })
    .fill('운영체제 핵심 복습');
  await page.keyboard.press('Alt+9');
  assert.ok(
    page.url().includes('view=study'),
    'Modal blocks navigation shortcuts',
  );
  await page.getByRole('button', { name: '학습 저장' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.keyboard.press('Control+Shift+f');
  assert.equal(
    await page
      .getByLabel('학습 검색')
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press('Alt+9');
  assert.ok(
    page.url().includes('view=study'),
    'Input blocks navigation shortcuts',
  );
  await page
    .getByRole('button', { name: '운영체제 핵심 복습 보관', exact: true })
    .click();
  await waitFor(() => studyItems[0].archived, 'Study archived');
  await page.getByRole('button', { name: '보관함', exact: true }).click();
  await page
    .getByRole('button', { name: '운영체제 핵심 복습 다시 시작', exact: true })
    .click();
  await waitFor(() => !studyItems[0].archived, 'Study restored');
  await page.getByRole('button', { name: '전체 학습', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(350);
  await page.screenshot({ path: 'work/qa/study-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await pause(350);
  await page.locator('h1').click();
  await page.keyboard.press('Alt+9');
  await page.getByRole('region', { name: '중식 식단' }).waitFor();
  assert.equal(await page.locator('.meal-period').count(), 3);
  const mealBoxes = await page.locator('.meal-period').evaluateAll((elements) =>
    elements.map((el) => ({
      x: el.getBoundingClientRect().x,
      y: el.getBoundingClientRect().y,
    })),
  );
  assert.ok(mealBoxes[0].x < mealBoxes[1].x && mealBoxes[1].x < mealBoxes[2].x);
  assert.ok(
    mealBoxes.every((box) => Math.abs(box.y - mealBoxes[0].y) < 2),
    'Breakfast, lunch and dinner align in three columns',
  );
  await page.getByRole('button', { name: '석식', exact: true }).click();
  assert.equal(await page.locator('.meal-period').count(), 1);
  await page.getByRole('region', { name: '석식 식단' }).waitFor();
  await page.getByRole('button', { name: '전체 식사', exact: true }).click();
  await page.screenshot({ path: 'work/qa/meals-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await pause(350);
  await page.screenshot({ path: 'work/qa/meals-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await pause(350);
  files.push({
    id: crypto.randomUUID(),
    name: '한글 보고서 (최종).txt',
    size_bytes: 21,
    mime_type: 'text/plain',
    created_at: date,
    deleted_at: null,
    purge_started_at: null,
    url: null,
  });
  await page.goto(base + '/?view=files');
  const link = page.getByRole('link', {
    name: '한글 보고서 (최종).txt 다운로드',
    exact: true,
  });
  await link.waitFor();
  const expectedName = await link.getAttribute('download');
  assert.match(await link.getAttribute('href'), /^\/api\/files\/download\?id=/);
  await link.evaluate((element, fixtureBase) => {
    element.href = fixtureBase + '/download' + new URL(element.href).search;
  }, downloadBase);
  await link.click({ button: 'right' });
  const menuDownload = page.getByRole('menuitem', {
    name: '다운로드',
    exact: true,
  });
  assert.equal(await menuDownload.getAttribute('download'), expectedName);
  assert.match(
    await menuDownload.getAttribute('href'),
    /^\/api\/files\/download\?id=/,
  );
  await menuDownload.evaluate((element, fixtureBase) => {
    element.href = fixtureBase + '/download' + new URL(element.href).search;
  }, downloadBase);
  const downloadEvent = page.waitForEvent('download');
  await menuDownload.click();
  const download = await downloadEvent;
  assert.equal(
    download.suggestedFilename(),
    expectedName,
    'Unicode original filename preserved',
  );
  assert.equal(await download.failure(), null);
  assert.equal(
    await readFile(await download.path(), 'utf8'),
    'download verification',
  );
  await fileAction(expectedName, '삭제');
  await waitFor(
    () => Boolean(files.find((item) => item.name === expectedName)?.deleted_at),
    'File context menu moves file to trash',
  );
  const folderButton = page.getByRole('button', { name: '자료', exact: true });
  await folderButton.focus();
  await page.keyboard.press('F2');
  await page.getByLabel('폴더 이름', { exact: true }).fill('자료 수정');
  await page.getByRole('button', { name: '폴더 저장' }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '자료 수정', exact: true }).focus();
  await page.keyboard.press('Delete');
  await waitFor(
    () => Boolean(folders[0].deleted_at),
    'Delete on folder button moves folder to trash',
  );

  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await pause(350);
    for (const view of [
      'focus',
      'morning',
      'calendar',
      'notes',
      'study',
      'sleep',
      'workouts',
      'files',
      'meals',
      'settings',
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
    'PASS: note save/trash/restore/failure, study CRUD/review/archive, meal grouping/filter, original download filename, Windows shortcuts, drive/calendar regressions note context menus/settings and ten responsive panels.',
  );
} catch (error) {
  console.error('Browser errors:', errors);
  console.error((await page.locator('body').innerText()).slice(0, 2500));
  await page.screenshot({ path: 'work/qa/failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
  downloadServer.close();
}
