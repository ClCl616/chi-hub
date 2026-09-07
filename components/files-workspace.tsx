'use client';

import { useRef, useState } from 'react';
import { Download, File, FileArchive, FileImage, FolderOpen, Grid2X2, List, Trash2, Upload } from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';
type StoredFile = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  url: string | null;
};
const sizeLabel = (bytes: number | null) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
export function FilesWorkspace() {
  const records = useApi<{ files: StoredFile[] }>('/api/files');
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [uploads, setUploads] = useState<Array<{name:string;status:string}>>([]);
  const [view, setView] = useState<'list'|'grid'>('list');
  async function upload(files: File[]) {
    setBusy(true);
    setUploads(files.map(file=>({name:file.name,status:'업로드 중'})));
    for (const file of files) { const form = new FormData(); form.append('file', file); try { await apiRequest('/api/files',{method:'POST',body:form}); setUploads(items=>items.map(item=>item.name===file.name?{...item,status:'완료'}:item)); } catch { setUploads(items=>items.map(item=>item.name===file.name?{...item,status:'실패'}:item)); } }
    await records.refresh(); setBusy(false); if(inputRef.current)inputRef.current.value='';
  }
  async function remove(id: string) {
    if (!window.confirm('이 파일을 영구 삭제할까요?')) return;
    try {
      await apiRequest(`/api/files?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      await records.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '삭제하지 못했습니다.',
      );
    }
  }
  return (
    <div className="files-layout">
      <section className="upload-card">
        <FileArchive size={26} />
        <div>
        <h2>내 드라이브에 업로드</h2>
        <p>
          문서, 이미지, 압축 파일을 보관하세요. 파일당 최대 500MB까지 지원합니다.
        </p>
        </div>
        <input
          ref={inputRef}
          hidden
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length) void upload(files);
          }}
          type="file"
        />
        <button
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <Upload size={17} /> {busy ? '업로드 중…' : '파일 업로드'}
        </button>
        {message && (
          <output
            className={
              message.includes('못') || message.includes('설정') ? 'error' : ''
            }
          >
            {message}
          </output>
        )}
        {uploads.map(item=><output className={item.status==='실패'?'error':''} key={item.name}>{item.name} · {item.status}</output>)}
      </section>
      <section className="workspace-card file-list-card">
        <div className="section-title">
          <div>
            <p className="card-label"><FolderOpen size={15} /> MY DRIVE</p>
            <h2>내 드라이브</h2>
          </div>
          <div className="file-view-actions"><span>{records.data?.files.length ?? 0}개</span><button className={view==='list'?'active':''} onClick={()=>setView('list')} type="button" aria-label="목록 보기"><List size={15}/></button><button className={view==='grid'?'active':''} onClick={()=>setView('grid')} type="button" aria-label="격자 보기"><Grid2X2 size={15}/></button></div>
        </div>
        <DataNotice
          loading={records.loading}
          error={records.error}
          onRetry={records.refresh}
        />
        <div className={view==='grid'?'file-grid':'file-list'}>
          {(records.data?.files ?? []).map((item) => (
            <article className="file-row" key={item.id}>
              {item.mime_type?.startsWith('image/') && item.url ? <img className="file-preview" src={item.url} alt=""/> : <div className="file-icon">{item.mime_type?.startsWith('image/')?<FileImage size={19}/>:<File size={19}/>}</div>}
              <div>
                <strong>{item.name}</strong>
                <span>
                  {sizeLabel(item.size_bytes)} ·{' '}
                  {new Intl.DateTimeFormat('ko-KR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }).format(new Date(item.created_at))}
                </span>
              </div>
              <div>
                {item.url && (
                  <a
                    aria-label={`${item.name} 다운로드`}
                    href={item.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Download size={16} />
                  </a>
                )}
                <button
                  aria-label={`${item.name} 삭제`}
                  onClick={() => remove(item.id)}
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
        {!records.loading && !records.error && !records.data?.files.length && (
          <DataNotice empty="아직 보관한 파일이 없습니다." />
        )}
      </section>
    </div>
  );
}
