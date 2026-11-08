import * as React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookMarked, Building2, Clapperboard, FolderKanban, KeyRound, LayoutDashboard, LogOut, Settings, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AiRunBar } from '@/components/common/AiStatus';
import { SaveIndicator, VaultBadge } from '@/components/common/StatusBadges';
import { VaultUnlockDialog } from '@/features/provider/VaultDialogs';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useUiStore } from '@/stores/uiStore';
import { useVaultStore } from '@/vault/vaultStore';
import { isDemoMode } from '@/config/firebase';
import { MSG } from '@/ai/messages';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Dashboard', short: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', short: 'Project', icon: FolderKanban },
  { to: '/brands', label: 'Brands', short: 'Brand', icon: Building2 },
  { to: '/library', label: 'Prompt Library', short: 'Library', icon: BookMarked },
  { to: '/provider', label: 'AI Provider', short: 'AI', icon: KeyRound },
  { to: '/settings', label: 'Settings', short: 'Atur', icon: Settings },
];

function useVaultLifecycle() {
  const init = useVaultStore((s) => s.init);
  const touch = useVaultStore((s) => s.touch);
  const checkIdle = useVaultStore((s) => s.checkIdle);
  React.useEffect(() => {
    void init();
  }, [init]);
  React.useEffect(() => {
    let last = 0;
    const onAct = () => {
      const now = Date.now();
      if (now - last > 5000) {
        last = now;
        touch();
      }
    };
    const evs = ['pointerdown', 'keydown', 'scroll'] as const;
    evs.forEach((e) => window.addEventListener(e, onAct, { passive: true }));
    const t = setInterval(() => checkIdle(), 30_000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, onAct));
      clearInterval(t);
    };
  }, [touch, checkIdle]);
}

export function AppShell() {
  useVaultLifecycle();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const vaultStatus = useVaultStore((s) => s.status);
  const activeKeys = useVaultStore((s) => s.keys.filter((k) => k.enabled).length);
  const project = useProjectStore((s) => s.project);
  const saveStatus = useProjectStore((s) => s.saveStatus);
  const flush = useProjectStore((s) => s.flush);
  const online = useUiStore((s) => s.online);

  return (
    <div className="flex min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:p-2">
        Lewati ke konten
      </a>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">AI Video Prompt</p>
            <p className="text-xs text-muted-foreground">Studio</p>
          </div>
        </div>
        <nav aria-label="Navigasi utama" className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-2 border-t p-4 text-xs">
          <p className="truncate text-muted-foreground" title={user?.email ?? ''}>
            {user?.email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start px-2"
            onClick={async () => {
              await useProjectStore.getState().unload();
              await logout();
              navigate('/login');
            }}
          >
            <LogOut /> Keluar
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Clapperboard className="h-5 w-5 text-primary md:hidden" aria-hidden />
            <p className="truncate text-sm font-medium">{project ? project.name || 'Project tanpa nama' : ''}</p>
            {project && <SaveIndicator status={saveStatus} onRetry={() => void flush()} />}
          </div>
          {isDemoMode && (
            <Badge variant="warning" className="hidden sm:inline-flex" title="Data project hanya di browser ini">
              Mode Demo Lokal
            </Badge>
          )}
          <button type="button" onClick={() => navigate('/provider')} className="flex items-center gap-2" aria-label="Status vault dan key">
            <VaultBadge status={vaultStatus} />
            <Badge variant="outline" className="hidden sm:inline-flex">
              {activeKeys} key aktif
            </Badge>
          </button>
        </header>

        {!online && (
          <div role="status" className="flex items-center gap-2 bg-warning/15 px-4 py-2 text-sm text-warning">
            <WifiOff className="h-4 w-4" /> {MSG.offline}
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-10">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Navigasi bawah" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-card md:hidden">
        {NAV.map(({ to, short, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex flex-col items-center gap-0.5 py-2 text-[10px]', isActive ? 'text-primary' : 'text-muted-foreground')
            }
          >
            <Icon className="h-5 w-5" />
            {short}
          </NavLink>
        ))}
      </nav>

      <AiRunBar />
      <VaultUnlockDialog />
    </div>
  );
}
