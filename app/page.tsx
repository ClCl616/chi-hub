import { AppShell } from '@/components/app-shell';
import { ArrowUpRight, Check, Moon, TimerReset } from 'lucide-react';

const today = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date());

export default function DashboardPage() {
  return <AppShell>
    <div className="page-heading"><div><p className="eyebrow">{today}</p><h1>오늘도, 나답게.</h1><p className="page-description">하루의 리듬을 한곳에서 가볍게 확인하세요.</p></div><button className="primary-button" type="button">빠른 기록 <ArrowUpRight size={17}/></button></div>
    <section className="dashboard-grid" aria-label="오늘의 요약">
      <article className="focus-card"><div className="card-label"><TimerReset size={17}/> 집중</div><div className="timer-value">25:00</div><p>첫 번째 집중 세션을 시작해볼까요?</p><button className="timer-button" type="button">집중 시작</button></article>
      <article className="summary-card"><div className="summary-icon"><Moon size={20}/></div><div><span>어젯밤 수면</span><strong>— 시간</strong><small>아직 기록이 없어요</small></div></article>
      <article className="summary-card"><div className="summary-icon"><Check size={20}/></div><div><span>오늘의 루틴</span><strong>0 / 3</strong><small>작은 것부터 시작해요</small></div></article>
      <article className="week-card"><div className="card-header"><div><p className="card-label">이번 주 흐름</p><h2>꾸준함이 쌓이는 중</h2></div><span>9월 1주</span></div><div className="week-chart" aria-label="이번 주 활동 기록">{[30,46,24,63,42,18,10].map((height,index)=><div className="day" key={index}><div className="bar-track"><span style={{height:`${height}%`}}/></div><small>{['월','화','수','목','금','토','일'][index]}</small></div>)}</div></article>
    </section>
  </AppShell>;
}
