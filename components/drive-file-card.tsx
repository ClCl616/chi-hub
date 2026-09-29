'use client';

import Image from 'next/image';
import {
  Download,
  File as FileIcon,
  FolderInput,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';

export type StoredFile = {
  folder_id: string | null;
  trash_root_id: string | null;
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

export function DriveFileCard({
  item,
  trash,
  busy,
  now,
  onMove,
  onTrash,
}: {
  item: StoredFile;
  trash: boolean;
  busy: boolean;
  now: number;
  onMove: () => void;
  onTrash: () => void;
}) {
  const expires = item.deleted_at
    ? new Date(Date.parse(item.deleted_at) + 30 * 86400000)
    : null;
  const expired =
    !!item.purge_started_at || !!(expires && expires.getTime() <= now);
  const href = `/api/files/download?id=${encodeURIComponent(item.id)}`;
  const contents = (
    <>
      <div className="drive-thumbnail">
        {item.mime_type?.startsWith('image/') && item.url ? (
          <Image src={item.url} alt="" width={180} height={225} unoptimized />
        ) : (
          <FileIcon size={48} />
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
    </>
  );
  return (
    <ContextMenu>
      <ContextMenuTrigger className="drive-item">
        {trash ? (
          <div className="drive-file-card" aria-label={item.name}>
            {contents}
          </div>
        ) : (
          <a
            className="drive-file-card"
            href={href}
            download={item.name}
            aria-label={`${item.name} 다운로드`}
          >
            {contents}
          </a>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent className="note-actions-menu">
        {trash ? (
          <ContextMenuItem disabled={busy || expired} onClick={onTrash}>
            <RotateCcw size={16} />
            복원
          </ContextMenuItem>
        ) : (
          <>
            <ContextMenuItem
              render={
                <a href={href} download={item.name} aria-label="다운로드" />
              }
            >
              <Download size={16} />
              다운로드
            </ContextMenuItem>
            <ContextMenuItem disabled={busy} onClick={onMove}>
              <FolderInput size={16} />
              이동
            </ContextMenuItem>
            <ContextMenuItem
              disabled={busy}
              onClick={onTrash}
              variant="destructive"
            >
              <Trash2 size={16} />
              삭제
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
