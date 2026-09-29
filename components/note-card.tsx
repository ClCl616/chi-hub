'use client';

import Image from 'next/image';
import { BookOpen, MoreHorizontal, Pin, RotateCcw, Trash2 } from 'lucide-react';
import type { Note } from '@/hooks/use-note-editor';
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function NoteCard({
  note,
  trash,
  busy,
  expired,
  onOpen,
  onRemove,
  onRestore,
}: {
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
      <ContextMenuTrigger className="note-card">
        <button className="note-tile" onClick={onOpen} disabled={busy}>
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
                <strong>{title}</strong>
                <p>{note.content.slice(0, 240)}</p>
              </>
            )}
          </div>
          <strong>
            {note.pinned && <Pin size={13} />} {title}
          </strong>
          <small>
            {trash ? '삭제일' : note.category} ·{' '}
            {new Date(note.deleted_at || note.updated_at).toLocaleDateString(
              'ko-KR',
            )}
          </small>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="note-more"
            aria-label={`${title} 메뉴`}
            disabled={busy}
          >
            <MoreHorizontal size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="note-actions-menu" align="end">
            {actions.map(
              ({ label, icon: Icon, run, disabled, destructive }) => (
                <DropdownMenuItem
                  key={label}
                  onClick={run}
                  disabled={disabled}
                  variant={destructive ? 'destructive' : 'default'}
                >
                  <Icon size={16} />
                  {label}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuContent>
        </DropdownMenu>
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
