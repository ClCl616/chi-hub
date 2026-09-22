import type { LucideIcon } from 'lucide-react';
export type NavigationProps = {
  navigation: { id: string; label: string; icon: LucideIcon }[];
  authState: 'checking' | 'ready' | 'offline';
  logout: () => Promise<void>;
  activeView: string;
  selectView: (value: string) => void;
  toggleSidebar: () => void;
};
