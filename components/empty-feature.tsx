import type { LucideIcon } from 'lucide-react';
import { AppShell } from '@/components/app-shell';

export function EmptyFeature({ icon: Icon, eyebrow, title, description, action }: { icon: LucideIcon; eyebrow: string; title: string; description: string; action: string }) {
  return <AppShell><div className="feature-page"><header className="feature-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></header><section className="empty-state"><div className="empty-icon"><Icon size={28}/></div><h2>첫 기록을 기다리고 있어요</h2><p>이 공간은 다음 단계에서 실제 데이터와 연결됩니다.<br/>지금은 CHI.HUB의 구조와 흐름을 미리 둘러보세요.</p><button type="button" disabled>{action}</button><span>COMING NEXT</span></section></div></AppShell>;
}
