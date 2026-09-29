import { Keyboard, MousePointer2 } from 'lucide-react';

const shortcuts = [
  ['작업 전환', 'Ctrl + K'],
  ['설정 · 사용 안내', 'F1'],
  ['화면 이동 (타이머부터 학식까지 순서대로)', 'Alt + 1~9'],
  ['현재 화면 검색', 'Ctrl + Shift + F'],
  ['새 항목 / 드라이브 추가 메뉴', 'Alt + N'],
  ['메모 저장', 'Ctrl + S'],
  ['메뉴 · 팝업 닫기', 'Esc'],
  ['드라이브 폴더 이름 변경 (폴더에 포커스)', 'F2'],
  ['드라이브 폴더를 휴지통으로 이동 (폴더에 포커스)', 'Delete'],
  ['다음 / 이전 항목으로 포커스 이동', 'Tab / Shift + Tab'],
  ['버튼 실행', 'Enter / Space'],
];

export function SettingsWorkspace() {
  return (
    <div className="settings-workspace">
      <p className="settings-intro">
        마우스 조작과 단축키 안내를 한곳에서 확인하세요.
      </p>
      <section className="settings-card" aria-labelledby="mouse-settings-title">
        <h2 id="mouse-settings-title">
          <MousePointer2 size={20} /> 마우스 조작
        </h2>
        <dl className="mouse-guide">
          <div>
            <dt>메모 우클릭</dt>
            <dd>
              메모를 열거나 삭제할 수 있습니다. 삭제한 메모는 휴지통으로
              이동하며 30일 동안 복원할 수 있습니다.
            </dd>
          </div>
          <div>
            <dt>휴지통에서 우클릭</dt>
            <dd>삭제한 메모의 내용을 보거나 복원할 수 있습니다.</dd>
          </div>
          <div>
            <dt>드라이브 파일 우클릭</dt>
            <dd>
              다운로드, 폴더 이동, 삭제를 선택할 수 있습니다. 휴지통에서는
              복원할 수 있습니다.
            </dd>
          </div>
          <div>
            <dt>카드 드래그</dt>
            <dd>
              메모와 파일을 다른 카드에 놓으면 순서가 바뀝니다. 메모는 왼쪽
              폴더, 파일은 폴더나 상단 경로에 놓아 이동합니다. 파일 정렬은
              드래그하면 사용자 지정순으로 전환됩니다.
            </dd>
          </div>
          <div>
            <dt>탭 즐겨찾기</dt>
            <dd>
              탭 옆 별을 누르면 즐겨찾기에 모입니다. 그룹 제목을 눌러 접거나
              펼칠 수 있고, 내 프로필과 설정은 목록 하단에 고정됩니다. 폴더·카드
              순서·즐겨찾기는 계정에 저장됩니다.
            </dd>
          </div>
          <div>
            <dt>터치 화면</dt>
            <dd>메모나 파일 카드를 길게 눌러 같은 메뉴를 열 수 있습니다.</dd>
          </div>
          <div>
            <dt>뒤로 / 앞으로</dt>
            <dd>
              마우스의 뒤로·앞으로 버튼과 브라우저 탐색 버튼으로 이전에 보던
              탭을 오갈 수 있습니다.
            </dd>
          </div>
        </dl>
      </section>
      <section
        className="settings-card"
        aria-labelledby="keyboard-settings-title"
      >
        <h2 id="keyboard-settings-title">
          <Keyboard size={20} /> 키보드 단축키
        </h2>
        <dl className="shortcut-guide">
          {shortcuts.map(([label, key]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <kbd>{key}</kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="settings-footnote">
          입력 중에는 Alt 단축키가 동작하지 않습니다. 메뉴나 팝업을 열면 화면
          이동 단축키가 잠시 중지됩니다. 파일 다운로드 링크에서는 Enter로
          다운로드할 수 있습니다. Mac에서는 Ctrl 대신 ⌘ 키도 사용할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
