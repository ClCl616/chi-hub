import { ArrowLeft } from 'lucide-react';
export default function Page() {
  return (
    <main className="simple-public">
      <p className="eyebrow">CHI.LOG ARCHIVE</p>
      <h1>
        기존 기록을
        <br />
        옮겨올 자리예요.
      </h1>
      <p>콘텐츠 이전은 기반 작업 이후에 차근차근 진행합니다.</p>
      <a href="/">
        <ArrowLeft size={16} /> CHI.HUB으로
      </a>
    </main>
  );
}
