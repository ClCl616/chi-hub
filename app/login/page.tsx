import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-card auth-card">
        <Link className="public-brand" href="/">
          <span className="brand-mark">C</span> CHI.HUB
        </Link>
        <div className="auth-intro">
          <p className="eyebrow">PRIVATE SPACE</p>
          <h1>반가워요.</h1>
          <p>계속하려면 로그인하세요.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
