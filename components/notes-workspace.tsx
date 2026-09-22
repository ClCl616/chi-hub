'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Folder,
  Grid2X2,
  List,
  Pin,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
import { apiRequest, useApi } from '@/hooks/use-api';
import { type Note, useNoteEditor } from '@/hooks/use-note-editor';
import { DataNotice } from '@/components/feature-layout';
const RichNoteEditor = lazy(() =>
  import('@/components/rich-note-editor').then((module) => ({
    default: module.RichNoteEditor,
  })),
);
import { DrawingPad } from '@/components/drawing-pad';
import { WorkspaceDialog } from '@/components/workspace-dialog';

const categories = ['업무', '공부', '아이디어', '개인'];
export function NotesWorkspace() {
  const notes = useApi<{ notes: Note[] }>('/api/notes');
  const editor = useNoteEditor((note) =>
    notes.setData((data) => ({
      notes: [
        note,
        ...(data?.notes ?? []).filter((item) => item.id !== note.id),
      ],
    })),
  );
  const { draft, update, save, status, saving } = editor;
  const root = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [raw, setRaw] = useState(false);
  const [preview, setPreview] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 's' &&
        editing &&
        root.current?.getClientRects().length
      ) {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [save, editing]);
  const filtered = (notes.data?.notes ?? [])
    .filter(
      (note) =>
        (category === '전체' ||
          (category === '고정' ? note.pinned : note.category === category)) &&
        `${note.title} ${note.content_type === 'drawing' ? '' : note.content}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.updated_at.localeCompare(a.updated_at),
    );
  async function open(note?: Note) {
    if (await editor.open(note)) {
      setEditing(true);
      setPreview(false);
      setRaw(/<\/?[a-z][^>]*>|^\[\^/im.test(note?.content ?? ''));
      setError('');
    }
  }
  async function remove() {
    setDeleting(true);
    setError('');
    try {
      if (!(await save())) return;
      await apiRequest(`/api/notes?id=${encodeURIComponent(draft.id)}`, {
        method: 'DELETE',
      });
      notes.setData((data) => ({
        notes: (data?.notes ?? []).filter((note) => note.id !== draft.id),
      }));
      editor.reset();
      setEditing(false);
      setDeleteOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : '삭제하지 못했습니다.',
      );
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div ref={root} className={`notes-studio ${editing ? 'is-editing' : ''}`}>
      {!editing ? (
        <>
          <aside className="notes-categories">
            <h2>
              <BookOpen size={19} /> 내 메모
            </h2>
            {['전체', '고정', ...categories].map((item) => (
              <button
                key={item}
                className={category === item ? 'active' : ''}
                onClick={() => setCategory(item)}
              >
                <Folder size={17} />
                {item}
                <span>
                  {
                    (notes.data?.notes ?? []).filter(
                      (note) =>
                        item === '전체' ||
                        (item === '고정'
                          ? note.pinned
                          : note.category === item),
                    ).length
                  }
                </span>
              </button>
            ))}
          </aside>
          <section className="notes-library">
            <header className="library-toolbar">
              <div>
                <p className="card-label">MY NOTES</p>
                <h2>{category === '전체' ? '모든 메모' : category}</h2>
              </div>
              <button className="submit-button" onClick={() => void open()}>
                <Plus size={17} />
                메모 작성
              </button>
            </header>
            <div className="library-filters">
              <label className="search-field">
                <Search size={17} />
                <input
                  aria-label="메모 검색"
                  placeholder="제목과 내용 검색"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="file-view-actions">
                <button
                  aria-label="메모 격자 보기"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                >
                  <Grid2X2 size={18} />
                </button>
                <button
                  aria-label="메모 목록 보기"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
            <DataNotice
              loading={notes.loading}
              error={notes.error}
              onRetry={notes.refresh}
            />
            <div className={`note-gallery ${view}`}>
              {filtered.map((note) => (
                <button
                  className="note-tile"
                  key={note.id}
                  onClick={() => void open(note)}
                >
                  <div className={`note-paper ${note.content_type}`}>
                    {note.content_type === 'drawing' ? (
                      <Image
                        src={note.content}
                        alt="필기 미리보기"
                        width={180}
                        height={225}
                        unoptimized
                      />
                    ) : (
                      <>
                        <strong>{note.title || '제목 없는 메모'}</strong>
                        <p>{note.content.slice(0, 240)}</p>
                      </>
                    )}
                  </div>
                  <strong>
                    {note.pinned && <Pin size={13} />}{' '}
                    {note.title || '제목 없는 메모'}
                  </strong>
                  <small>
                    {note.category} ·{' '}
                    {new Date(note.updated_at).toLocaleDateString('ko-KR')}
                  </small>
                </button>
              ))}
            </div>
            {!notes.loading && !notes.error && !filtered.length && (
              <DataNotice
                empty={
                  query ? '검색 결과가 없습니다.' : '새 메모를 만들어보세요.'
                }
              />
            )}
          </section>
        </>
      ) : (
        <section className="note-document">
          <header className="document-toolbar">
            <button
              aria-label="메모 목록으로"
              onClick={async () => {
                if (await save()) setEditing(false);
              }}
            >
              <ArrowLeft size={18} />
              <span>목록</span>
            </button>
            <select
              aria-label="메모 형식"
              value={draft.content_type}
              onChange={(event) =>
                update({
                  content_type: event.target.value as Note['content_type'],
                })
              }
            >
              <option value="markdown">Markdown 문서</option>
              <option value="sticky">스티커</option>
              <option value="drawing">필기</option>
            </select>
            <select
              aria-label="메모 카테고리"
              value={draft.category}
              onChange={(event) => update({ category: event.target.value })}
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <button
              aria-pressed={draft.pinned}
              onClick={() => update({ pinned: !draft.pinned })}
            >
              <Pin size={16} />
              고정
            </button>
            <button
              className="save-button"
              onClick={() => void save()}
              disabled={saving}
            >
              <Save size={16} />
              저장
            </button>
            <output aria-live="polite">{status}</output>
            {draft.id && (
              <button
                aria-label="메모 삭제"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </header>
          {draft.content_type === 'markdown' && (
            <div className="markdown-toolbar">
              <button
                aria-pressed={!raw && !preview}
                onClick={() => {
                  setRaw(false);
                  setPreview(false);
                }}
              >
                서식 편집
              </button>
              <button
                aria-pressed={raw && !preview}
                onClick={() => {
                  setRaw(true);
                  setPreview(false);
                }}
              >
                Markdown 원문
              </button>
              <button
                aria-pressed={preview}
                onClick={() => setPreview(!preview)}
              >
                {preview ? '편집' : '읽기 모드'}
              </button>
              <span>Ctrl / ⌘ + S 저장</span>
            </div>
          )}
          <div className={`document-canvas ${draft.content_type}`}>
            <div className="document-page">
              <input
                className="note-title-input"
                aria-label="메모 제목"
                maxLength={120}
                placeholder="제목 없는 메모"
                value={draft.title}
                onChange={(event) => update({ title: event.target.value })}
              />
              {draft.content_type === 'drawing' ? (
                <DrawingPad
                  key={draft.id}
                  value={draft.content}
                  onChange={(content) => update({ content })}
                />
              ) : preview && draft.content_type === 'markdown' ? (
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                    {draft.content || '*내용을 입력해주세요.*'}
                  </ReactMarkdown>
                </div>
              ) : draft.content_type === 'markdown' && !raw ? (
                <Suspense
                  fallback={
                    <p className="editor-hint">편집기를 준비하고 있습니다…</p>
                  }
                >
                  <RichNoteEditor
                    value={draft.content}
                    onChange={(content) => update({ content })}
                  />
                </Suspense>
              ) : (
                <textarea
                  ref={text}
                  aria-label="메모 내용"
                  className="note-content-input"
                  maxLength={50000}
                  placeholder={
                    draft.content_type === 'markdown'
                      ? '생각을 기록하세요. Markdown으로 제목, 표, 체크리스트와 코드를 작성할 수 있습니다.'
                      : '지금 떠오른 생각을 적어보세요…'
                  }
                  value={draft.content}
                  onChange={(event) => update({ content: event.target.value })}
                />
              )}
            </div>
          </div>
        </section>
      )}
      <WorkspaceDialog
        open={deleteOpen}
        onOpenChange={(value) => {
          if (!deleting) setDeleteOpen(value);
        }}
        title="메모를 삭제할까요?"
        description="삭제한 메모는 복구할 수 없습니다."
      >
        <div className="dialog-actions">
          <button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            취소
          </button>
          <button
            className="danger"
            onClick={() => void remove()}
            disabled={deleting}
          >
            {deleting ? '삭제 중…' : '삭제'}
          </button>
        </div>
        {error && <p role="alert">{error}</p>}
      </WorkspaceDialog>
    </div>
  );
}
