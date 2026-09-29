'use client';
import { useRef, useState, type DragEvent } from 'react';

export function useCardDrag(type: string, disabled: boolean) {
  const source = useRef<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null),
    [target, setTarget] = useState<string | null>(null);
  function clear() {
    source.current = null;
    setDragged(null);
    setTarget(null);
  }
  function draggable(id: string) {
    return {
      draggable: !disabled,
      'data-dragging': dragged === id || undefined,
      onDragStart(event: DragEvent<HTMLElement>) {
        if (disabled) {
          event.preventDefault();
          return;
        }
        event.stopPropagation();
        event.dataTransfer.clearData();
        event.dataTransfer.setData(type, id);
        event.dataTransfer.effectAllowed = 'move';
        source.current = id;
        setDragged(id);
      },
      onDragEnd: clear,
    };
  }
  function dropZone(key: string) {
    const accepts = (event: DragEvent<HTMLElement>) =>
      !disabled && !!source.current && event.dataTransfer.types.includes(type);
    return {
      'data-drop-target': target === key || undefined,
      onDragOver(event: DragEvent<HTMLElement>) {
        if (accepts(event)) {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = 'move';
          setTarget(key);
        }
      },
      onDragLeave() {
        if (target === key) setTarget(null);
      },
    };
  }
  function drop(event: DragEvent<HTMLElement>, action: (id: string) => void) {
    if (disabled || !source.current || !event.dataTransfer.types.includes(type))
      return;
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData(type);
    if (id === source.current) action(id);
    clear();
  }
  return { draggable, dropZone, drop };
}
