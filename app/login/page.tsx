import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LoginForm } from '@/components/login-form';
export default function LoginPage(){return <main className="login-page"><section className="login-card auth-card"><Link className="public-brand" href="/"><span className="brand-mark">C</span> CHI.HUB</Link><div className="auth-intro"><p className="eyebrow">PRIVATE SPACE</p><h1>나의 허브로<br/>돌아오세요.</h1><p>기록은 내 계정에 안전하게 보관되고 모든 기기에서 이어집니다.</p></div><LoginForm/><Link href="/"><ArrowLeft size={15}/> 둘러보기로 돌아가기</Link></section></main>}
