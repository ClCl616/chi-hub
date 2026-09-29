'use client';
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, useApi } from '@/hooks/use-api';
import {
  emptyPreferences,
  type PreferenceKey,
  type PreferenceResponse,
} from '@/lib/workspace-preferences';

function usePreferencesStore() {
  const records = useApi<PreferenceResponse>('/api/preferences');
  const flight = useRef(false);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  async function savePreference(key: PreferenceKey, value: string[]) {
    if (flight.current || !records.data) return false;
    flight.current = true;
    setSaving(true);
    setError('');
    const previous = records.data;
    records.setData({
      ...previous,
      preferences: { ...previous.preferences, [key]: value },
    });
    try {
      const result = await apiRequest<{ version: string }>('/api/preferences', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          key,
          value,
          version: previous.versions[key] ?? null,
        }),
      });
      records.setData(
        (data) =>
          data && {
            ...data,
            versions: { ...data.versions, [key]: result.version },
          },
      );
      return true;
    } catch (reason) {
      records.setData(previous);
      setError(
        reason instanceof Error
          ? reason.message
          : '설정을 저장하지 못했습니다.',
      );
      await records.refresh();
      return false;
    } finally {
      flight.current = false;
      setSaving(false);
    }
  }
  return {
    preferences: records.data?.preferences ?? emptyPreferences,
    ready: !!records.data && !records.loading,
    saving,
    error: error || records.error,
    savePreference,
    refresh: records.refresh,
  };
}
const PreferencesContext = createContext<ReturnType<
  typeof usePreferencesStore
> | null>(null);
export function WorkspacePreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PreferencesContext.Provider value={usePreferencesStore()}>
      {children}
    </PreferencesContext.Provider>
  );
}
export function useWorkspacePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('Workspace preferences provider is required');
  return context;
}
