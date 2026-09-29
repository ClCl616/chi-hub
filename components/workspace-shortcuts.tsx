'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { WorkspaceDialog } from '@/components/workspace-dialog';

export function WorkspaceShortcuts({
  navigation,
  selectView,
}: {
  navigation: { id: string; label: string }[];
  selectView: (view: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.repeat ||
        event.getModifierState('AltGraph')
      )
        return;
      if (
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
        )
      )
        return;
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.code === 'KeyK'
      ) {
        event.preventDefault();
        setQuery('');
        setOpen(true);
        return;
      }
      const panel = Array.from(
        document.querySelectorAll<HTMLElement>('.tab-view'),
      ).find((item) => item.getClientRects().length > 0);
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.code === 'KeyF'
      ) {
        const search = panel?.querySelector<HTMLInputElement>(
          '.search-field input',
        );
        if (search) {
          event.preventDefault();
          search.focus();
          search.select();
        }
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="textbox"]',
        )
      )
        return;
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        const index = /^Digit[1-9]$/.test(event.code)
          ? Number(event.code.slice(-1)) - 1
          : -1;
        if (navigation[index]) {
          event.preventDefault();
          selectView(navigation[index].id);
        }
        if (event.code === 'KeyN') {
          const action = panel?.querySelector<HTMLElement>(
            '[data-workspace-new]:not(:disabled)',
          );
          if (action) {
            event.preventDefault();
            action.focus();
            action.click();
          }
        }
      }
      if (
        event.code === 'F1' &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        selectView('settings');
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [navigation, selectView]);
  return (
    <>
      <WorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        title="작업 전환"
        description="이동할 작업을 선택하세요. 사용 안내는 설정에서 확인할 수 있습니다."
      >
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="작업 검색"
            placeholder="작업 이름 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                const item = navigation.find((item) =>
                  item.label.includes(query),
                );
                if (item) {
                  selectView(item.id);
                  setOpen(false);
                }
              }
            }}
          />
        </label>
        <div className="shortcut-destinations">
          {navigation.map(
            (item) =>
              item.label.includes(query) && (
                <button
                  key={item.id}
                  onClick={() => {
                    selectView(item.id);
                    setOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                </button>
              ),
          )}
        </div>
      </WorkspaceDialog>
    </>
  );
}
