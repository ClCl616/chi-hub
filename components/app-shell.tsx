'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, BriefcaseBusiness, Dumbbell, FileArchive, LayoutDashboard, LogIn, Menu, MoonStar, NotebookPen, TimerReset } from 'lucide-react';

const navigation=[
  {href:'/',label:'홈',icon:LayoutDashboard},{href:'/focus',label:'집중',icon:TimerReset},{href:'/morning',label:'루틴',icon:MoonStar},{href:'/workouts',label:'운동',icon:Dumbbell},{href:'/notes',label:'메모',icon:NotebookPen},{href:'/files',label:'파일',icon:FileArchive},
];
export function AppShell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 return <div className="app-shell">
  <aside className="sidebar"><Link className="brand" href="/" aria-label="CHI.HUB 홈"><span className="brand-mark">C</span><span>CHI.HUB<small>personal operating system</small></span></Link><nav className="side-nav" aria-label="주 메뉴"><p>MY SPACE</p>{navigation.map(({href,label,icon:Icon})=><Link className={pathname===href?'active':''} href={href} key={href}><Icon size={19}/><span>{label}</span></Link>)}<p>PUBLIC</p><Link className={pathname==='/portfolio'?'active':''} href="/portfolio"><BriefcaseBusiness size={19}/><span>포트폴리오</span></Link><Link href="/chi-log"><BookOpen size={19}/><span>CHI.LOG</span></Link></nav><div className="sidebar-footer"><Link href="/login"><LogIn size={18}/> 로그인</Link></div></aside>
  <div className="mobile-header"><Link className="mobile-brand" href="/"><span className="brand-mark">C</span> CHI.HUB</Link><button aria-label="메뉴 열기" type="button"><Menu size={22}/></button></div>
  <main className="main-content">{children}</main>
  <nav className="bottom-nav" aria-label="모바일 주 메뉴">{navigation.slice(0,5).map(({href,label,icon:Icon})=><Link className={pathname===href?'active':''} href={href} key={href}><Icon size={20}/><span>{label}</span></Link>)}</nav>
 </div>;
}
