'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pin, Plus, Search, Trash2 } from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';

type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  content_type: 'markdown' | 'sticky' | 'drawing';
  category: string;
  created_at: string;
  updated_at: string;
};
function DrawingPad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => { const canvas = canvasRef.current; if (!canvas || !value) return; const image = new Image(); image.onload = () => canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height); image.src = value; }, [value]);
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current!; const bounds = canvas.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height }; };
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { drawing.current = true; event.currentTarget.setPointerCapture(event.pointerId); const context = canvasRef.current?.getContext('2d'); const p = point(event); context?.beginPath(); context?.moveTo(p.x, p.y); };
  const draw = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const canvas = canvasRef.current!; const context = canvas.getContext('2d')!; const p = point(event); context.lineTo(p.x, p.y); context.strokeStyle = '#171916'; context.lineWidth = 4; context.lineCap = 'round'; context.lineJoin = 'round'; context.stroke(); };
  const end = () => { if (!drawing.current) return; drawing.current = false; onChange(canvasRef.current?.toDataURL('image/png') ?? ''); };
  const clear = () => { const canvas = canvasRef.current; if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); onChange(''); };
  return <div className="drawing-pad"><div><span>펜 또는 마우스로 필기하세요.</span><button type="button" onClick={clear}>지우기</button></div><canvas aria-label="필기 캔버스" ref={canvasRef} width="1200" height="700" onPointerDown={start} onPointerMove={draw} onPointerUp={end} onPointerCancel={end}/></div>;
}
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
  const [preview, setPreview] = useState(false);
  const savedSnapshot = useRef('');
  const loadingNote = useRef(false);
  const newDraft = useRef(false);
  const statusTimer = useRef<number | null>(null);
  const snapshot = () => JSON.stringify({ title, content, pinned, category, contentType });
  useEffect(()=>{if(loadingNote.current){loadingNote.current=false;return}if((!selectedId&&!newDraft.current)||!content.trim()||snapshot()===savedSnapshot.current)return;setStatus('');const timer=window.setTimeout(()=>void save(),800);return()=>window.clearTimeout(timer)},[title,content,pinned,category,contentType,selectedId]);
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
    if (selectedId && content.trim() && snapshot() !== savedSnapshot.current) void save();
    loadingNote.current = true;
    setSelectedId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setPinned(note.pinned);
    setCategory(note.category ?? '개인');
    setContentType(note.content_type ?? 'markdown');
    savedSnapshot.current = JSON.stringify({ title: note.title, content: note.content, pinned: note.pinned, category: note.category ?? '개인', contentType: note.content_type ?? 'markdown' });
    setStatus('');
  }
  function startNew() {
    newDraft.current = true;
    setSelectedId(null);
    setTitle('');
    setContent('');
    setPinned(false);
    setCategory('개인');
    setContentType('markdown');
    savedSnapshot.current = '';
    setStatus('새 메모');
  }
  async function save() {
    if (!content.trim()) return;
    setStatus('저장 중…');
    const statusStartedAt = Date.now();
    let savedTitle = title;
    try {
      if (selectedId) {
        await apiRequest('/api/notes', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: selectedId, title, content, pinned, category, contentType }),
        });
      } else {
        const generatedTitle = title.trim() || `새 메모 · ${new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date())}`;
        savedTitle = generatedTitle;
        if (!title.trim()) setTitle(generatedTitle);
        const result = await apiRequest<{ note: Note }>('/api/notes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ title: generatedTitle, content, pinned, category, contentType }),
        });
        setSelectedId(result.note.id);
        newDraft.current = false;
        await notes.refresh();
      }
      savedSnapshot.current = JSON.stringify({ title: savedTitle, content, pinned, category, contentType });
      const remaining = 1200 - (Date.now() - statusStartedAt);
      if (remaining > 0) await new Promise((resolve) => window.setTimeout(resolve, remaining));
      setStatus('저장됨');
      if(statusTimer.current)window.clearTimeout(statusTimer.current);statusTimer.current=window.setTimeout(()=>setStatus(''),3000);
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
      setCategory('개인');
      setContentType('markdown');
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
          {contentType === 'markdown' && <button className={preview ? 'active' : ''} onClick={() => setPreview((value) => !value)} type="button">{preview ? '편집' : '미리보기'}</button>}
          <output className={`save-status ${status ? 'visible' : ''}`}>{status}</output>
          {selectedId && (
            <button className="danger-text" onClick={remove} type="button">
              <Trash2 size={15} /> 삭제
            </button>
          )}
        </div>
        <input
          aria-label="메모 제목"
          className="note-title-input"
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목"
          value={title}
        />
        {contentType === 'drawing' ? <DrawingPad value={content} onChange={setContent}/> : preview ? <pre className="markdown-preview">{content || 'Markdown 미리보기'}</pre> : <textarea
          aria-label="메모 내용"
          className={`note-content-input ${contentType === 'sticky' ? 'sticky-content-input' : ''}`}
          maxLength={50000}
          onChange={(event) => setContent(event.target.value)}
          placeholder="지금 떠오른 생각을 적어보세요…"
          value={content}
        />}
      </section>
    </div>
  );
}
