'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Archive,
  BookOpen,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { dateKey } from '@/lib/calendar';
import {
  reviewInterval,
  reviewRatings,
  type StudyItem,
  type StudyReview,
} from '@/lib/study';
import { DataNotice } from '@/components/feature-layout';
import { WorkspaceDialog } from '@/components/workspace-dialog';

const blank = () => ({
  id: crypto.randomUUID(),
  title: '',
  content: '',
  subject: '일반',
  due_date: dateKey(new Date()),
});
export function StudyWorkspace() {
  const [scope, setScope] = useState('today');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [today, setToday] = useState(() => dateKey(new Date()));
  const records = useApi<{
    items: StudyItem[];
    total: number;
    reviews: StudyReview[];
  }>(
    `/api/study?scope=${scope}&today=${today}&page=${page}&q=${encodeURIComponent(search)}`,
  );
  const [draft, setDraft] = useState<ReturnType<typeof blank> | null>(null);
  const [original, setOriginal] = useState<StudyItem | null>(null);
  const [reviewing, setReviewing] = useState<StudyItem | null>(null);
  const [revealed, setRevealed] = useState(false);
  const requestId = useRef('');
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    const refreshDate = () => setToday(dateKey(new Date()));
    const timer = setInterval(refreshDate, 60000);
    window.addEventListener('focus', refreshDate);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refreshDate);
    };
  }, []);
  const items = records.data?.items ?? [];
  const total = records.data?.total ?? 0;
  function edit(item?: StudyItem) {
    setOriginal(item ?? null);
    setDraft(item ? { ...item } : blank());
    setError('');
  }
  function startReview(item: StudyItem) {
    requestId.current = crypto.randomUUID();
    setReviewing(item);
    setRevealed(false);
    setError('');
  }
  async function mutate(body: object, method = 'PATCH') {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ item: StudyItem }>('/api/study', {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      setPage(0);
      await records.refresh();
      return result.item;
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '저장하지 못했습니다.',
      );
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (!draft) return;
    const input = {
      ...draft,
      title: draft.title.trim(),
      subject: draft.subject.trim(),
    };
    const saved = await mutate(
      { ...input, action: 'edit', updated_at: original?.updated_at },
      original ? 'PATCH' : 'POST',
    );
    if (saved) {
      if (
        !original &&
        ['title', 'content', 'subject', 'due_date'].some(
          (key) =>
            saved[key as keyof StudyItem] !== input[key as keyof typeof input],
        )
      ) {
        setOriginal(saved);
        setError(
          '앞선 요청이 이미 저장되었습니다. 현재 변경 내용을 다시 저장해주세요.',
        );
        return;
      }
      setDraft(null);
      setMessage('학습 항목을 저장했습니다.');
    }
  }
  async function review(rating: string) {
    if (!reviewing) return;
    const item = await mutate({
      id: reviewing.id,
      action: 'review',
      request_id: requestId.current,
      expected_count: reviewing.review_count,
      rating,
      reviewed_on: dateKey(new Date()),
    });
    if (item) {
      setReviewing(null);
      setMessage(`복습 완료! 다음 복습일은 ${item.due_date}입니다.`);
    }
  }
  return (
    <div className="study-workspace">
      <section className="study-intro">
        <div>
          <p className="card-label">LEARN · RECALL · REPEAT</p>
          <h2>조금씩, 오래 기억하기</h2>
          <p>학습한 내용을 꺼내 보고, 기억한 정도에 맞춰 다시 복습하세요.</p>
        </div>
        <button
          className="submit-button"
          data-workspace-new
          onClick={() => edit()}
        >
          <Plus size={18} />
          학습 추가
        </button>
      </section>
      <div className="study-toolbar">
        <div className="study-filters" aria-label="복습 목록">
          {[
            ['today', '오늘 복습'],
            ['all', '전체 학습'],
            ['archived', '보관함'],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={scope === id}
              onClick={() => {
                setScope(id);
                setPage(0);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="학습 검색"
            placeholder="학습 제목 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <p className="study-help">
        {scope === 'today'
          ? '오늘까지 복습할 항목입니다. 지난 복습도 함께 표시합니다.'
          : scope === 'archived'
            ? '잠시 멈춘 학습입니다. 다시 시작하면 복습 목록으로 돌아갑니다.'
            : '복습할 날짜를 직접 바꾸거나 미리 복습할 수 있습니다.'}{' '}
        · 기억했어요: 1 → 3 → 7 → 14 → 30 → 60일
      </p>
      {message && (
        <output className="drive-message" aria-live="polite">
          {message}
        </output>
      )}
      {!draft && !reviewing && error && <p role="alert">{error}</p>}
      <DataNotice
        loading={records.loading}
        error={records.error}
        onRetry={records.refresh}
      />
      {!records.loading && !records.error && (
        <>
          <div className="study-count">
            <strong>{total}개 학습</strong>
            <span>{today}</span>
          </div>
          <div className="study-grid">
            {items.map((item) => (
              <article className="study-card" key={item.id}>
                <header>
                  <span className="study-subject">{item.subject}</span>
                  <span className={item.due_date < today ? 'overdue' : ''}>
                    {item.due_date < today ? '복습 지남 · ' : ''}
                    {item.due_date}
                  </span>
                </header>
                <h3>{item.title}</h3>
                <p>
                  {item.content
                    ? '내용을 떠올린 뒤 복습에서 확인하세요.'
                    : '학습한 내용을 스스로 떠올려보세요.'}
                </p>
                <small>
                  복습 {item.review_count}회 · {item.stage}단계
                </small>
                <footer>
                  {!item.archived && (
                    <button
                      className="submit-button"
                      onClick={() => startReview(item)}
                    >
                      <BookOpen size={16} />
                      복습하기
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`${item.title} 수정`}
                    onClick={() => edit(item)}
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={`${item.title} ${item.archived ? '다시 시작' : '보관'}`}
                    onClick={async () => {
                      if (
                        await mutate({
                          id: item.id,
                          action: 'archive',
                          archived: !item.archived,
                          updated_at: item.updated_at,
                        })
                      )
                        setMessage(
                          item.archived
                            ? '학습을 다시 시작합니다.'
                            : '학습을 보관했습니다.',
                        );
                    }}
                  >
                    {item.archived ? (
                      <RotateCcw size={17} />
                    ) : (
                      <Archive size={17} />
                    )}
                  </button>
                </footer>
              </article>
            ))}
          </div>
          {!items.length && (
            <div className="study-empty">
              <Check size={36} />
              <h3>
                {scope === 'today' && !search
                  ? '오늘 복습을 모두 마쳤어요'
                  : '학습 항목이 없습니다'}
              </h3>
              <p>
                {scope === 'today'
                  ? '전체 학습에서 미리 복습하거나 새로운 학습을 추가하세요.'
                  : '제목을 검색하거나 학습을 추가해보세요.'}
              </p>
            </div>
          )}
          {total > 30 && (
            <nav className="study-pagination" aria-label="학습 페이지">
              <button disabled={!page} onClick={() => setPage(page - 1)}>
                이전
              </button>
              <span>
                {page + 1} / {Math.ceil(total / 30)}
              </span>
              <button
                disabled={(page + 1) * 30 >= total}
                onClick={() => setPage(page + 1)}
              >
                다음
              </button>
            </nav>
          )}
        </>
      )}
      <WorkspaceDialog
        open={!!draft}
        onOpenChange={(value) => {
          if (!value && !busy) setDraft(null);
        }}
        title={original ? '학습 수정' : '새 학습'}
        description="제목에 질문이나 학습 주제를, 내용에 정답이나 핵심 정리를 적어보세요."
      >
        {draft && (
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label>
              학습 제목
              <input
                required
                maxLength={160}
                disabled={busy}
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              과목
              <input
                required
                maxLength={60}
                disabled={busy}
                value={draft.subject}
                onChange={(e) =>
                  setDraft({ ...draft, subject: e.target.value })
                }
              />
            </label>
            <label>
              학습 내용
              <textarea
                rows={7}
                disabled={busy}
                maxLength={20000}
                value={draft.content}
                onChange={(e) =>
                  setDraft({ ...draft, content: e.target.value })
                }
              />
            </label>
            <label>
              다음 복습일
              <input
                type="date"
                disabled={busy}
                required
                value={draft.due_date}
                onChange={(e) =>
                  setDraft({ ...draft, due_date: e.target.value })
                }
              />
            </label>
            <button className="submit-button" disabled={busy}>
              {busy ? '저장 중…' : '학습 저장'}
            </button>
            {error && <p role="alert">{error}</p>}
          </form>
        )}
      </WorkspaceDialog>
      <WorkspaceDialog
        open={!!reviewing}
        onOpenChange={(value) => {
          if (!value && !busy) setReviewing(null);
        }}
        title={reviewing?.title ?? '복습'}
        description="먼저 내용을 떠올려보세요. 확인한 뒤 기억한 정도를 선택하면 다음 복습일을 정합니다."
      >
        {reviewing && (
          <div className="study-review">
            <span className="study-subject">
              {reviewing.subject} · 복습 {reviewing.review_count}회
            </span>
            {revealed ? (
              <>
                <pre className="study-answer">
                  {reviewing.content ||
                    '등록된 내용이 없습니다. 학습한 내용을 떠올렸나요?'}
                </pre>
                <div className="study-ratings">
                  {reviewRatings.map((rating) => (
                    <button
                      key={rating.id}
                      disabled={busy}
                      onClick={() => void review(rating.id)}
                    >
                      <strong>{rating.label}</strong>
                      <span>
                        {reviewInterval(reviewing.stage, rating.id)}일 후
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <button
                className="submit-button"
                onClick={() => setRevealed(true)}
              >
                내용 확인
              </button>
            )}
            {!!records.data?.reviews.filter(
              (item) => item.item_id === reviewing.id,
            ).length && (
              <div className="study-history">
                <strong>최근 복습</strong>
                {records.data.reviews
                  .filter((item) => item.item_id === reviewing.id)
                  .map((item) => (
                    <p key={item.id}>
                      {item.reviewed_on} ·{' '}
                      {reviewRatings.find((r) => r.id === item.rating)?.label}
                    </p>
                  ))}
              </div>
            )}
            {error && (
              <p role="alert">
                {error}{' '}
                <button
                  onClick={() => {
                    setReviewing(null);
                    void records.refresh();
                  }}
                >
                  목록 새로고침
                </button>
              </p>
            )}
          </div>
        )}
      </WorkspaceDialog>
    </div>
  );
}
