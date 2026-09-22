'use client';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from '@tiptap/markdown';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import { useEffect, useRef, useState } from 'react';
import { WorkspaceDialog } from '@/components/workspace-dialog';
const blocks = [
  ['본문', 'text', (e: Editor) => e.chain().focus().setParagraph().run()],
  [
    '제목 1',
    'h1',
    (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  ],
  [
    '제목 2',
    'h2',
    (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  ],
  [
    '제목 3',
    'h3',
    (e: Editor) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  ],
  [
    '글머리 목록',
    'bullet',
    (e: Editor) => e.chain().focus().toggleBulletList().run(),
  ],
  [
    '번호 목록',
    'number',
    (e: Editor) => e.chain().focus().toggleOrderedList().run(),
  ],
  [
    '할 일 목록',
    'task',
    (e: Editor) => e.chain().focus().toggleTaskList().run(),
  ],
  ['인용', 'quote', (e: Editor) => e.chain().focus().toggleBlockquote().run()],
  [
    '코드 블록',
    'code',
    (e: Editor) => e.chain().focus().toggleCodeBlock().run(),
  ],
  [
    '구분선',
    'divider',
    (e: Editor) => e.chain().focus().setHorizontalRule().run(),
  ],
  [
    '표',
    'table',
    (e: Editor) =>
      e
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  ],
] as const;
export function RichNoteEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const change = useRef(onChange);
  useEffect(() => {
    change.current = onChange;
  }, [onChange]);
  const last = useRef(value),
    [slash, setSlash] = useState<{
      from: number;
      to: number;
      query: string;
    } | null>(null),
    [index, setIndex] = useState(0),
    [linkOpen, setLinkOpen] = useState(false),
    [url, setUrl] = useState(''),
    [error, setError] = useState('');
  const menu = useRef<{ slash: typeof slash; index: number }>({
    slash: null,
    index: 0,
  });
  useEffect(() => {
    menu.current = { slash, index };
  }, [slash, index]);
  const updateSlash = (editor: Editor) => {
    const { $from, empty } = editor.state.selection;
    const text = $from.parent.textBetween(0, $from.parentOffset);
    const match = empty && text.match(/^\/([^\s/]*)$/);
    setSlash(
      match ? { from: $from.start(), to: $from.pos, query: match[1] } : null,
    );
    setIndex(0);
  };
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, protocols: ['https', 'http', 'mailto'] },
      }),
      Markdown,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit,
      Image,
      Placeholder.configure({
        placeholder: '내용을 입력하거나 / 를 눌러 블록을 추가하세요.',
      }),
    ],
    content: value,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        'aria-label': '서식 있는 메모 내용',
        role: 'textbox',
        'aria-multiline': 'true',
      },
      handleKeyDown: (_view, event) => {
        const state = menu.current;
        if (!state.slash) return false;
        const choices = blocks.filter(([label, id]) =>
          `${label} ${id}`.includes(state.slash!.query),
        );
        if (event.key === 'Escape') {
          setSlash(null);
          return true;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          setIndex((i) =>
            choices.length
              ? (i + (event.key === 'ArrowDown' ? 1 : choices.length - 1)) %
                choices.length
              : 0,
          );
          return true;
        }
        if (event.key === 'Enter' && choices[state.index]) {
          event.preventDefault();
          editor
            ?.chain()
            .focus()
            .deleteRange({ from: state.slash.from, to: state.slash.to })
            .run();
          if (editor) choices[state.index][2](editor);
          setSlash(null);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const md = editor.getMarkdown();
      last.current = md;
      change.current(md);
      updateSlash(editor);
    },
    onSelectionUpdate: ({ editor }) => updateSlash(editor),
  });
  useEffect(() => {
    if (editor && value !== last.current) {
      editor.commands.setContent(value, {
        contentType: 'markdown',
        emitUpdate: false,
      });
      last.current = value;
    }
  }, [editor, value]);
  const choices = slash
    ? blocks.filter(([label, id]) => `${label} ${id}`.includes(slash.query))
    : [];
  return (
    <div className="rich-note">
      <div className="rich-toolbar" role="toolbar" aria-label="문서 서식">
        <select
          aria-label="블록 종류"
          value=""
          onChange={(e) => {
            const block = blocks.find((b) => b[1] === e.target.value);
            if (editor && block) block[2](editor);
          }}
        >
          <option value="">블록 추가 / 변환</option>
          {blocks.map(([label, id]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        {[
          ['굵게', 'bold'],
          ['기울임', 'italic'],
          ['취소선', 'strike'],
          ['인라인 코드', 'code'],
        ].map(([label, mark]) => (
          <button
            type="button"
            key={mark}
            aria-pressed={editor?.isActive(mark) ?? false}
            onClick={() => editor?.chain().focus().toggleMark(mark).run()}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => {
            setUrl(editor?.getAttributes('link').href ?? '');
            setError('');
            setLinkOpen(true);
          }}
        >
          링크
        </button>
        <button
          aria-label="실행 취소"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          ↶
        </button>
        <button
          aria-label="다시 실행"
          onClick={() => editor?.chain().focus().redo().run()}
        >
          ↷
        </button>
        {editor?.isActive('table') && (
          <>
            <button onClick={() => editor.chain().focus().addRowAfter().run()}>
              행 추가
            </button>
            <button
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              열 추가
            </button>
            <button onClick={() => editor.chain().focus().deleteRow().run()}>
              행 삭제
            </button>
            <button onClick={() => editor.chain().focus().deleteTable().run()}>
              표 삭제
            </button>
          </>
        )}
      </div>
      <EditorContent editor={editor} />
      {slash && (
        <div className="slash-menu" role="menu" aria-label="블록 명령">
          {choices.length ? (
            choices.map(([label, id, run], i) => (
              <button
                key={id}
                role="menuitem"
                data-selected={index === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  if (editor) {
                    editor
                      .chain()
                      .focus()
                      .deleteRange({ from: slash.from, to: slash.to })
                      .run();
                    run(editor);
                  }
                  setSlash(null);
                }}
              >
                {label}
                <small>/{id}</small>
              </button>
            ))
          ) : (
            <p>일치하는 블록이 없습니다.</p>
          )}
        </div>
      )}
      <p className="editor-hint">
        / 블록 메뉴 · # 제목 · **굵게** · [] 할 일 · Ctrl / ⌘ + S 저장
      </p>
      <WorkspaceDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title="링크 편집"
        description="주소를 입력하거나 비워두면 링크를 해제합니다."
      >
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (url && !/^(https?:\/\/|mailto:)/i.test(url)) {
              setError('https:// 또는 mailto: 주소를 입력해주세요.');
              return;
            }
            if (url)
              editor
                ?.chain()
                .focus()
                .extendMarkRange('link')
                .setLink({ href: url })
                .run();
            else editor?.chain().focus().unsetLink().run();
            setLinkOpen(false);
          }}
        >
          <input
            aria-label="링크 주소"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="submit-button">적용</button>
          {error && <p role="alert">{error}</p>}
        </form>
      </WorkspaceDialog>
    </div>
  );
}
