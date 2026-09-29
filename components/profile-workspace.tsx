'use client';
import { useState } from 'react';
import { UserRound, LogOut } from 'lucide-react';
import { apiRequest, useApi } from '@/hooks/use-api';
import { DataNotice } from '@/components/feature-layout';
export function ProfileWorkspace() {
  const records = useApi<{
    profile: { email: string; displayName: string; createdAt: string };
  }>('/api/profile');
  const [name, setName] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function save() {
    setBusy(true);
    setMessage('');
    try {
      await apiRequest('/api/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          displayName: name ?? records.data?.profile.displayName ?? '',
        }),
      });
      await records.refresh();
      setName(null);
      setMessage('프로필을 저장했습니다.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '저장하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-workspace">
      <section className="settings-card profile-card">
        <h2>
          <UserRound size={22} /> 내 프로필
        </h2>
        <DataNotice
          loading={records.loading}
          error={records.error}
          onRetry={records.refresh}
        />
        {records.data && (
          <form
            className="stack-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label>
              이메일
              <input
                aria-label="프로필 이메일"
                value={records.data.profile.email}
                readOnly
              />
            </label>
            <label>
              표시 이름
              <input
                aria-label="표시 이름"
                value={name ?? records.data.profile.displayName}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                disabled={busy}
              />
            </label>
            <button className="submit-button" disabled={busy}>
              {busy ? '저장 중…' : '프로필 저장'}
            </button>
          </form>
        )}
        {message && (
          <output className="drive-message" aria-live="polite">
            {message}
          </output>
        )}
        <button
          className="profile-logout"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await apiRequest('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch {
              setMessage('로그아웃하지 못했습니다. 다시 시도해주세요.');
              setBusy(false);
            }
          }}
        >
          <LogOut size={17} /> 로그아웃
        </button>
      </section>
    </div>
  );
}
