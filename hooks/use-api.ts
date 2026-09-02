'use client';

import { useCallback, useEffect, useState } from 'react';

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    let lastError = '데이터를 불러오지 못했습니다.';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        if (!response.ok) throw new Error(body.message ?? lastError);
        setData(body as T);
        setLoading(false);
        return;
      } catch (reason) {
        lastError = reason instanceof Error ? reason.message : lastError;
        if (attempt === 0)
          await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    setError(lastError);
    setLoading(false);
  }, [url]);
  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);
  return { data, loading, error, refresh, setData };
}

export async function apiRequest<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as T & {
    message?: string;
  };
  if (!response.ok)
    throw new Error(body.message ?? '요청을 처리하지 못했습니다.');
  return body as T;
}
