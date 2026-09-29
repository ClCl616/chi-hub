'use client';
import { useEffect, useState } from 'react';
import { Keyboard, Search } from 'lucide-react';
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
        setQuery('');
        setOpen(true);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [navigation, selectView]);
  return (
    <>
      <button
        className="workspace-shortcuts-button"
        title="작업 전환 및 단축키 (Ctrl+K)"
        onClick={() => {
          setQuery('');
          setOpen(true);
        }}
      >
        <Keyboard size={17} />
        <span>단축키</span>
        <kbd>Ctrl K</kbd>
      </button>
      <WorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        title="작업 전환 · 단축키"
        description="마우스와 키보드로 빠르게 이동하세요. 입력 중에는 Alt 단축키가 동작하지 않습니다."
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
            (item, index) =>
              item.label.includes(query) && (
                <button
                  key={item.id}
                  onClick={() => {
                    selectView(item.id);
                    setOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  <kbd>Alt {index + 1}</kbd>
                </button>
              ),
          )}
        </div>
        <dl className="shortcut-guide">
          <div>
            <dt>작업 전환 / 도움말</dt>
            <dd>
              <kbd>Ctrl K</kbd> / <kbd>F1</kbd>
            </dd>
          </div>
          <div>
            <dt>현재 화면 검색</dt>
            <dd>
              <kbd>Ctrl Shift F</kbd>
            </dd>
          </div>
          <div>
            <dt>새 항목 / 드라이브 추가 메뉴</dt>
            <dd>
              <kbd>Alt N</kbd>
            </dd>
          </div>
          <div>
            <dt>메모 저장</dt>
            <dd>
              <kbd>Ctrl S</kbd>
            </dd>
          </div>
          <div>
            <dt>팝업 닫기</dt>
            <dd>
              <kbd>Esc</kbd>
            </dd>
          </div>
          <div>
            <dt>폴더 버튼에서 이름 변경</dt>
            <dd>
              <kbd>F2</kbd>
            </dd>
          </div>
          <div>
            <dt>드라이브 항목에서 휴지통 이동</dt>
            <dd>
              <kbd>Delete</kbd>
            </dd>
          </div>
        </dl>
        <p className="drive-hint">
          Tab / Shift+Tab으로 이동하고 Enter / Space로 버튼을 실행합니다. 파일
          다운로드 링크에서 Enter는 다운로드, Delete는 휴지통 이동입니다.
          브라우저 뒤로 가기와 마우스 뒤로 버튼도 사용할 수 있습니다.
        </p>
      </WorkspaceDialog>
    </>
  );
}
