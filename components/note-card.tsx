'use client';

import Image from 'next/image';
import type { HTMLAttributes } from 'react';
import { BookOpen, Pin, RotateCcw, Trash2 } from 'lucide-react';
import type { Note } from '@/hooks/use-note-editor';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';

export function NoteCard({
  note,
  trash,
  busy,
  expired,
  onOpen,
  onRemove,
  onRestore,
  dragProps,
}: {
  dragProps?: HTMLAttributes<HTMLDivElement>;
  note: Note;
  trash: boolean;
  busy: boolean;
  expired: boolean;
  onOpen: () => void;
  onRemove: () => void;
  onRestore: () => void;
}) {
  const title = note.title || '제목 없는 메모';
  const actions = [
    {
      label: trash ? '내용 보기' : '열기',
      icon: BookOpen,
      run: onOpen,
      disabled: busy,
      destructive: false,
    },
    {
      label: trash ? '복원' : '삭제',
      icon: trash ? RotateCcw : Trash2,
      run: trash ? onRestore : onRemove,
      disabled: busy || (trash && expired),
      destructive: !trash,
    },
  ];
  return (
    <ContextMenu>
      <ContextMenuTrigger className="note-card" {...dragProps}>
        <button className="note-tile" onClick={onOpen} disabled={busy}>
          <div className={`note-paper ${note.content_type}`}>
            {note.pinned && (
              <span className="note-pin" title="고정된 메모">
                <Pin size={15} fill="currentColor" aria-hidden="true" />
                <span className="sr-only">고정된 메모</span>
              </span>
            )}
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
                <strong>{title}</strong>
                <p>{note.content.slice(0, 240)}</p>
              </>
            )}
          </div>
          <strong>{title}</strong>
          <small>
            {trash ? '삭제일' : note.category} ·{' '}
            {new Date(note.deleted_at || note.updated_at).toLocaleDateString(
              'ko-KR',
            )}
          </small>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="note-actions-menu">
        {actions.map(({ label, icon: Icon, run, disabled, destructive }) => (
          <ContextMenuItem
            key={label}
            onClick={run}
            disabled={disabled}
            variant={destructive ? 'destructive' : 'default'}
          >
            <Icon size={16} />
            {label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
