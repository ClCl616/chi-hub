import { AppShell } from '@/components/app-shell';
import { FocusTimer } from '@/components/focus-timer';
export default function FocusPage(){return <AppShell><div className="focus-page"><header className="feature-heading"><p className="eyebrow">POMODORO</p><h1>집중</h1><p>해야 할 일을 하나 고르고, 지금 이 시간에만 몰입하세요.</p></header><FocusTimer/></div></AppShell>}
