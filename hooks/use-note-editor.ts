'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/hooks/use-api';

export type Note = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  content_type: 'markdown' | 'sticky' | 'drawing';
  category: string;
  created_at: string;
  updated_at: string;
};
export type Draft = Omit<Note, 'created_at' | 'updated_at'>;
const blank = (): Draft => ({
  id: '',
  title: '',
  content: '',
  pinned: false,
  content_type: 'markdown',
  category: '개인',
});

// One write at a time. Edits made during a request are written next, to the same ID.
export function useNoteEditor(onSaved: (note: Note) => void) {
  const [draft, setDraft] = useState<Draft>(blank);
  const current = useRef(draft);
  const persisted = useRef(false);
  const saved = useRef(JSON.stringify(draft));
  const flight = useRef<Promise<boolean> | null>(null);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);
  const update = useCallback((patch: Partial<Draft>) => {
    current.current = { ...current.current, ...patch };
    setDraft(current.current);
    setStatus('저장 대기');
  }, []);
  const save = useCallback((): Promise<boolean> => {
    if (flight.current) return flight.current;
    if (
      JSON.stringify(current.current) === saved.current ||
      (!persisted.current && !current.current.content.trim())
    )
      return Promise.resolve(true);
    clearTimeout(statusTimer.current);
    setSaving(true);
    setStatus('저장 중…');
    flight.current = (async () => {
      try {
        while (JSON.stringify(current.current) !== saved.current) {
          if (!persisted.current && !current.current.content.trim()) break;
          if (!current.current.id)
            current.current = { ...current.current, id: crypto.randomUUID() };
          if (!persisted.current && !current.current.title.trim())
            current.current = { ...current.current, title: '새 메모' };
          const snapshot = { ...current.current };
          setDraft(current.current);
          const result = await apiRequest<{ note: Note }>('/api/notes', {
            method: persisted.current ? 'PATCH' : 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              ...snapshot,
              contentType: snapshot.content_type,
            }),
          });
          persisted.current = true;
          saved.current = JSON.stringify(snapshot);
          onSavedRef.current(result.note);
        }
        setStatus('저장됨');
        statusTimer.current = setTimeout(() => setStatus(''), 1900);
        return true;
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : '저장하지 못했습니다. 다시 저장해주세요.',
        );
        return false;
      } finally {
        flight.current = null;
        setSaving(false);
      }
    })();
    return flight.current;
  }, []);
  useEffect(() => {
    if (JSON.stringify(draft) === saved.current) return;
    const timer = setTimeout(() => void save(), 800);
    return () => clearTimeout(timer);
  }, [draft, save]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (
        JSON.stringify(current.current) !== saved.current &&
        (persisted.current || current.current.content.trim())
      )
        event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      clearTimeout(statusTimer.current);
    };
  }, []);
  const reset = useCallback((note?: Note) => {
    const value: Draft = note
      ? {
          id: note.id,
          title: note.title,
          content: note.content,
          pinned: note.pinned,
          category: note.category ?? '개인',
          content_type: note.content_type ?? 'markdown',
        }
      : blank();
    current.current = value;
    persisted.current = Boolean(note);
    saved.current = JSON.stringify(value);
    clearTimeout(statusTimer.current);
    setDraft(value);
    setStatus('');
  }, []);
  const open = async (note?: Note) => {
    if (!(await save())) return false;
    reset(note);
    return true;
  };
  return { draft, update, save, open, reset, status, saving };
}
