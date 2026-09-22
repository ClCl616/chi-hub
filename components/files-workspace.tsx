'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Download,
  File as FileIcon,
  FolderOpen,
  Grid2X2,
  HardDrive,
  List,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';

type StoredFile = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  deleted_at: string | null;
  purge_started_at: string | null;
  url: string | null;
};
const sizeLabel = (bytes: number | null) =>
  !bytes
    ? '0 KB'
    : bytes < 1048576
      ? `${Math.ceil(bytes / 1024)} KB`
      : `${(bytes / 1048576).toFixed(1)} MB`;
export function FilesWorkspace() {
  const [trash, setTrash] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const records = useApi<{ files: StoredFile[] }>(
    `/api/files${trash ? '?trash=true' : ''}`,
  );
  const refreshFiles = records.refresh;
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      void refreshFiles();
    }, 240000);
    return () => window.clearInterval(timer);
  }, [refreshFiles]);
  const input = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [uploads, setUploads] = useState<
    Array<{ name: string; status: string }>
  >([]);
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [sort, setSort] = useState('newest');
  async function upload(files: File[]) {
    if (uploading.current || !files.length) return;
    uploading.current = true;
    setBusy(true);
    setMessage('');
    setUploads(files.map((file) => ({ name: file.name, status: '대기' })));
    for (const [index, file] of files.entries()) {
      const status = (value: string) =>
        setUploads((items) =>
          items.map((item, i) =>
            i === index ? { ...item, status: value } : item,
          ),
        );
      try {
        if (file.size > 500 * 1024 * 1024) throw new Error('500MB 초과');
        status('업로드 중');
        const form = new FormData();
        form.append('file', file);
        await apiRequest('/api/files', { method: 'POST', body: form });
        status('완료');
      } catch (error) {
        status(error instanceof Error ? error.message : '실패');
      }
    }
    await records.refresh();
    uploading.current = false;
    setBusy(false);
    if (input.current) input.current.value = '';
  }
  async function move(item: StoredFile) {
    if (pending.includes(item.id)) return;
    setPending((items) => [...items, item.id]);
    setMessage('');
    // Hide immediately, then restore on failure. Never permanently delete here.
    records.setData((data) => ({
      files: (data?.files ?? []).filter((file) => file.id !== item.id),
    }));
    try {
      await apiRequest(
        `/api/files${trash ? '' : `?id=${encodeURIComponent(item.id)}`}`,
        trash
          ? {
              method: 'PATCH',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ id: item.id }),
            }
          : { method: 'DELETE' },
      );
      setMessage(
        trash
          ? '파일을 복원했습니다.'
          : '휴지통으로 이동했습니다. 30일 동안 복원할 수 있습니다.',
      );
    } catch (error) {
      records.setData((data) => ({
        files: [
          ...(data?.files ?? []).filter((file) => file.id !== item.id),
          item,
        ],
      }));
      setMessage(
        error instanceof Error ? error.message : '처리하지 못했습니다.',
      );
    } finally {
      setPending((items) => items.filter((id) => id !== item.id));
    }
  }
  const files = (records.data?.files ?? [])
    .filter(
      (file) =>
        !pending.includes(file.id) &&
        file.name.toLowerCase().includes(query.toLowerCase()) &&
        (kind === 'all' ||
          (kind === 'image'
            ? file.mime_type?.startsWith('image/')
            : kind === 'video'
              ? file.mime_type?.startsWith('video/')
              : !file.mime_type?.startsWith('image/') &&
                !file.mime_type?.startsWith('video/'))),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'ko')
        : sort === 'size'
          ? (b.size_bytes ?? 0) - (a.size_bytes ?? 0)
          : b.created_at.localeCompare(a.created_at),
    );
  return (
    <div
      className={`drive-workspace ${dragging ? 'is-dragging' : ''}`}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return;
        event.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = trash || busy ? 'none' : 'copy';
        }
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (trash) {
          setMessage('내 드라이브에서 파일을 업로드해주세요.');
          return;
        }
        void upload(Array.from(event.dataTransfer.files));
      }}
    >
      <aside className="drive-sidebar">
        <button
          className="drive-upload"
          disabled={busy || trash}
          onClick={() => input.current?.click()}
        >
          <Upload size={20} />
          {busy ? '업로드 중…' : '파일 업로드'}
        </button>
        <nav aria-label="드라이브 위치">
          <button
            disabled={pending.length > 0}
            className={!trash ? 'active' : ''}
            onClick={() => setTrash(false)}
          >
            <HardDrive size={19} />내 드라이브
          </button>
          <button
            disabled={pending.length > 0 || busy}
            className={trash ? 'active' : ''}
            onClick={() => setTrash(true)}
          >
            <Trash2 size={19} />
            휴지통
          </button>
        </nav>
        <p>
          나만의 비공개 저장 공간
          <br />
          파일당 최대 500MB
        </p>
      </aside>
      <section className="drive-content">
        <header className="library-toolbar">
          <div>
            <p className="card-label">MY DRIVE</p>
            <h2>{trash ? '휴지통' : '내 드라이브'}</h2>
          </div>
          <div className="file-view-actions">
            <button
              aria-label="파일 목록 보기"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List size={18} />
            </button>
            <button
              aria-label="파일 격자 보기"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <Grid2X2 size={18} />
            </button>
          </div>
        </header>
        <div className="library-filters">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="드라이브 검색"
              placeholder="파일 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="파일 유형"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="all">모든 유형</option>
            <option value="image">이미지</option>
            <option value="video">동영상</option>
            <option value="document">문서 및 기타</option>
          </select>
          <select
            aria-label="파일 정렬"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">최근 추가순</option>
            <option value="name">이름순</option>
            <option value="size">크기순</option>
          </select>
        </div>
        <p className="drive-hint">
          {trash
            ? '휴지통으로 이동한 파일은 30일 후 자동으로 영구 삭제됩니다.'
            : '파일을 이곳에 끌어다 놓으면 바로 업로드됩니다.'}
        </p>
        <input
          ref={input}
          type="file"
          hidden
          multiple
          onChange={(event) =>
            void upload(Array.from(event.target.files ?? []))
          }
        />
        {message && (
          <output className="drive-message" aria-live="polite">
            {message}
          </output>
        )}
        {uploads.length > 0 && (
          <div className="upload-progress" aria-live="polite">
            {uploads.map((item, index) => (
              <p key={index}>
                {item.name}
                <span>{item.status}</span>
              </p>
            ))}
          </div>
        )}
        <DataNotice
          loading={records.loading}
          error={records.error}
          onRetry={records.refresh}
        />
        <div className={`drive-items ${view}`}>
          {files.map((item) => {
            const expires = item.deleted_at
              ? new Date(new Date(item.deleted_at).getTime() + 30 * 86400000)
              : null;
            const expired = Boolean(
              item.purge_started_at || (expires && expires.getTime() <= now),
            );
            return (
              <article className="drive-item" key={item.id}>
                <div className="drive-thumbnail">
                  {item.mime_type?.startsWith('image/') && item.url ? (
                    <Image
                      src={item.url}
                      alt=""
                      width={240}
                      height={160}
                      unoptimized
                    />
                  ) : (
                    <FileIcon size={view === 'grid' ? 48 : 23} />
                  )}
                </div>
                <div className="drive-file-info">
                  <strong title={item.name}>{item.name}</strong>
                  <small>
                    {sizeLabel(item.size_bytes)} ·{' '}
                    {expires
                      ? expired
                        ? '영구 삭제 대기'
                        : `${expires.toLocaleDateString('ko-KR')} 삭제 예정`
                      : new Date(item.created_at).toLocaleDateString('ko-KR')}
                  </small>
                </div>
                <div className="drive-item-actions">
                  {trash ? (
                    <button
                      aria-label={`${item.name} 복원`}
                      disabled={expired}
                      onClick={() => void move(item)}
                    >
                      <RotateCcw size={17} />
                      <span>복원</span>
                    </button>
                  ) : (
                    <>
                      {item.url && (
                        <a
                          aria-label={`${item.name} 다운로드`}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Download size={17} />
                        </a>
                      )}
                      <button
                        aria-label={`${item.name} 휴지통으로 이동`}
                        onClick={() => void move(item)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {!records.loading && !records.error && !files.length && (
          <div className="drive-empty">
            <FolderOpen size={45} />
            <h3>
              {query
                ? '검색 결과가 없습니다.'
                : trash
                  ? '휴지통이 비어 있습니다.'
                  : '파일을 보관해보세요.'}
            </h3>
            {!trash && !query && (
              <p>파일을 끌어다 놓거나 파일 업로드를 선택하세요.</p>
            )}
          </div>
        )}
      </section>
      {dragging && (
        <div className="drop-overlay">
          <Upload size={40} />
          <strong>
            {trash
              ? '내 드라이브에서 업로드해주세요'
              : busy
                ? '현재 업로드가 끝난 뒤 추가해주세요'
                : '놓아서 업로드'}
          </strong>
        </div>
      )}
    </div>
  );
}
