'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pin, Plus, Search, Trash2 } from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};
export function NotesWorkspace() {
  const notes = useApi<{ notes: Note[] }>('/api/notes');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('개인');
  const [contentType, setContentType] = useState<'markdown'|'sticky'|'drawing'>('markdown');
  useEffect(()=>{if(!selectedId)return;setStatus('저장 대기…');const timer=window.setTimeout(()=>void save(),800);return()=>window.clearTimeout(timer)},[title,content,pinned]);
  const filtered = useMemo(
    () =>
      (notes.data?.notes ?? []).filter((item) =>
        `${item.title} ${item.content}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [notes.data, query],
  );
  function selectNote(note: Note) {
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setPinned(note.pinned);
    setStatus('');
  }
  function startNew() {
    setSelectedId(null);
    setTitle('');
    setContent('');
    setPinned(false);
    setStatus('새 메모');
  }
  async function save() {
    if (!title.trim() && !content.trim()) {
      setStatus('내용을 입력해주세요.');
      return;
    }
    setStatus('저장 중…');
    try {
      if (selectedId) {
        await apiRequest('/api/notes', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: selectedId, title, content, pinned, category, contentType }),
        });
      } else {
        const result = await apiRequest<{ note: Note }>('/api/notes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title, content, pinned, category, contentType }),
        });
        setSelectedId(result.note.id);
      }
      await notes.refresh();
      setStatus('저장됨');
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : '저장하지 못했습니다.',
      );
    }
  }
  async function remove() {
    if (!selectedId || !window.confirm('이 메모를 삭제할까요?')) return;
    try {
      await apiRequest(`/api/notes?id=${encodeURIComponent(selectedId)}`, {
        method: 'DELETE',
      });
      setSelectedId(null);
      setTitle('');
      setContent('');
      setPinned(false);
      await notes.refresh();
      setStatus('삭제됨');
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : '삭제하지 못했습니다.',
      );
    }
  }
  return (
    <div className="notes-layout">
      <aside className="workspace-card notes-sidebar">
        <div className="notes-actions">
          <button className="submit-button" onClick={startNew} type="button">
            <Plus size={16} /> 새 메모
          </button>
          <label className="search-field">
            <Search size={15} />
            <input
              aria-label="메모 검색"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="메모 검색"
              value={query}
            />
          </label>
        </div>
        <DataNotice
          loading={notes.loading}
          error={notes.error}
          onRetry={notes.refresh}
        />
        <div className="note-list">
          {filtered.map((item) => (
            <button
              className={selectedId === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => selectNote(item)}
              type="button"
            >
              <span>
                {item.pinned && <Pin size={12} />}{' '}
                {item.title || '제목 없는 메모'}
              </span>
              <small>{item.content.slice(0, 55) || '내용 없음'}</small>
              <time>
                {new Intl.DateTimeFormat('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                }).format(new Date(item.updated_at))}
              </time>
            </button>
          ))}
        </div>
        {!notes.loading && !notes.error && !filtered.length && (
          <DataNotice
            empty={query ? '검색 결과가 없습니다.' : '새 메모를 만들어보세요.'}
          />
        )}
      </aside>
      <section className="workspace-card note-editor">
        <div className="editor-toolbar">
          <select aria-label="메모 형식" value={contentType} onChange={(event)=>setContentType(event.target.value as 'markdown'|'sticky'|'drawing')}><option value="markdown">문서</option><option value="sticky">스티커</option><option value="drawing">필기</option></select>
          <select aria-label="카테고리" value={category} onChange={(event)=>setCategory(event.target.value)}>{['업무','공부','아이디어','개인'].map(item=><option key={item}>{item}</option>)}</select>
          <button
            className={pinned ? 'active' : ''}
            onClick={() => setPinned((value) => !value)}
            type="button"
          >
            <Pin size={16} /> {pinned ? '고정됨' : '고정'}
          </button>
          <output>{status}</output>
          {selectedId && (
            <button className="danger-text" onClick={remove} type="button">
              <Trash2 size={15} /> 삭제
            </button>
          )}
          <button className="save-button" onClick={save} type="button">
            저장
          </button>
        </div>
        <input
          aria-label="메모 제목"
          className="note-title-input"
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목"
          value={title}
        />
        {contentType === 'drawing' ? <textarea
          aria-label="필기 데이터"
          className="note-content-input"
          onChange={(event) => setContent(event.target.value)}
          placeholder="필기 모드: 태블릿 필기 데이터를 저장할 수 있습니다."
          value={content}
        /> : <textarea
          aria-label="메모 내용"
          className="note-content-input"
          maxLength={50000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="지금 떠오른 생각을 적어보세요…"
          value={content}
        />}
      </section>
    </div>
  );
}
