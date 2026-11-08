import * as React from 'react';
import { ArrowDown, ArrowUp, Eye, KeyRound, Lock, Pencil, Plus, Power, ShieldAlert, Trash2, Unlock, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { KeyStatusBadge, VaultBadge } from '@/components/common/StatusBadges';
import { EmptyState, LoadingState, PageHeader } from '@/components/common/states';
import { LABELS, ROUTINGS } from '@/config/enums';
import { MAX_KEYS, REVEAL_KEY_MS } from '@/config/constants';
import { aiService } from '@/ai/aiService';
import { countToday } from '@/domain/usageStats';
import { formatCountdown, formatRelative } from '@/lib/format';
import { useUiStore } from '@/stores/uiStore';
import { useVaultStore } from '@/vault/vaultStore';
import type { KeyView, Routing } from '@/types';
import { AddKeyDialog, EditKeyDialog } from './KeyDialogs';
import { SECURITY_WARNING, VaultSetupDialog } from './VaultDialogs';
import { UsagePanel, useUsage } from './UsagePanel';

const ROUTING_HELP: Record<Routing, string> = {
  round_robin: 'Bergilir antar key yang siap dipakai (default).',
  priority: 'Selalu pakai key prioritas tertinggi yang siap.',
  single: 'Hanya memakai satu key yang dipilih.',
};

function useNow(intervalMs = 1000) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function RevealedKey({ keyId, onDone }: { keyId: string; onDone: () => void }) {
  const reveal = useVaultStore((s) => s.revealKey);
  const [value, setValue] = React.useState<string | null>(null);
  const [left, setLeft] = React.useState(REVEAL_KEY_MS / 1000);
  React.useEffect(() => {
    let alive = true;
    void reveal(keyId).then((v) => alive && setValue(v));
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    const end = setTimeout(onDone, REVEAL_KEY_MS);
    return () => {
      alive = false;
      setValue(null);
      clearInterval(t);
      clearTimeout(end);
    };
  }, [keyId, reveal, onDone]);
  return (
    <div className="flex items-center gap-2 rounded-md bg-warning/10 p-2 text-xs">
      <code className="min-w-0 flex-1 break-all font-mono">{value ?? '…'}</code>
      <span className="shrink-0 text-muted-foreground">tersembunyi dalam {left}d</span>
    </div>
  );
}

function KeyCard({ k, index, total, todayCount }: { k: KeyView; index: number; total: number; todayCount: number }) {
  const { updateKey, removeKey, moveKey, meta } = useVaultStore();
  const now = useNow();
  const [busy, setBusy] = React.useState<'test' | 'gen' | null>(null);
  const [edit, setEdit] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [confirmReveal, setConfirmReveal] = React.useState(false);
  const [revealing, setRevealing] = React.useState(false);
  const stopReveal = React.useCallback(() => setRevealing(false), []);
  const projectCd = meta?.projectCooldowns[k.projectId]?.until ?? 0;
  const cdUntil = Math.max(k.cooldownUntil ?? 0, projectCd);

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              {k.label} <span className="font-mono text-xs text-muted-foreground">…{k.last4}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Project: <strong>{k.projectId}</strong> · Model: {k.model}
            </p>
          </div>
          <KeyStatusBadge status={k.status} />
          {!k.enabled && <Badge variant="muted">Nonaktif</Badge>}
          {meta?.routing === 'single' && meta.singleKeyId === k.id && <Badge>Key terpilih</Badge>}
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Prioritas</dt>
            <dd>{index + 1}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Terakhir dipakai</dt>
            <dd>{formatRelative(k.lastUsedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Request hari ini</dt>
            <dd>{todayCount} (lokal)</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cooldown</dt>
            <dd className={cdUntil > now ? 'font-medium text-warning' : undefined}>{cdUntil > now ? formatCountdown(cdUntil, now) : '-'}</dd>
          </div>
        </dl>
        {k.lastError && <p className="text-xs text-destructive">Error terakhir: {k.lastError}</p>}
        {revealing && <RevealedKey keyId={k.id} onDone={stopReveal} />}
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            loading={busy === 'test'}
            onClick={async () => {
              setBusy('test');
              const r = await aiService.testKey(k.id);
              setBusy(null);
              if (r.ok) toast[r.value.status === 'connected' ? 'success' : 'error'](`${k.label}: ${LABELS.keyStatus[r.value.status]}`);
              else toast.error(r.error.message);
            }}
          >
            Tes
          </Button>
          <Button
            size="sm"
            variant="outline"
            loading={busy === 'gen'}
            onClick={async () => {
              setBusy('gen');
              const r = await aiService.testGenerate(k.id);
              setBusy(null);
              if (r.ok) toast.success(`Tes Generate OK (${r.value.latencyMs} ms)`);
              else toast.error(r.error.message);
            }}
          >
            <Zap /> Tes Generate
          </Button>
          <Button size="sm" variant="outline" onClick={() => void updateKey(k.id, { enabled: !k.enabled })}>
            <Power /> {k.enabled ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
          <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => void moveKey(k.id, -1)} aria-label="Naikkan prioritas">
            <ArrowUp />
          </Button>
          <Button size="icon" variant="ghost" disabled={index === total - 1} onClick={() => void moveKey(k.id, 1)} aria-label="Turunkan prioritas">
            <ArrowDown />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setConfirmReveal(true)} aria-label="Tampilkan key 10 detik">
            <Eye />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setEdit(true)} aria-label="Edit key">
            <Pencil />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setDel(true)} aria-label="Hapus key">
            <Trash2 />
          </Button>
        </div>
      </CardContent>
      <EditKeyDialog keyView={edit ? k : null} onOpenChange={(v) => !v && setEdit(false)} />
      <ConfirmDialog
        open={confirmReveal}
        onOpenChange={setConfirmReveal}
        title="Tampilkan key?"
        description="Key akan terlihat selama 10 detik lalu disembunyikan lagi. Pastikan tidak ada orang lain yang melihat layar."
        confirmLabel="Tampilkan"
        onConfirm={() => setRevealing(true)}
      />
      <ConfirmDialog
        open={del}
        onOpenChange={setDel}
        title={`Hapus key "${k.label}"?`}
        destructive
        confirmLabel="Hapus"
        onConfirm={async () => {
          await removeKey(k.id);
          toast.success('Key dihapus');
        }}
      />
    </Card>
  );
}

export default function ProviderPage() {
  const { status, meta, keys, lock, setRouting, deleteAll } = useVaultStore();
  const setUnlockOpen = useUiStore((s) => s.setUnlockOpen);
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [delAll, setDelAll] = React.useState(false);
  const { logs } = useUsage(1);

  if (status === 'loading') return <LoadingState />;

  const total = keys.length;
  const active = keys.filter((k) => k.enabled).length;
  const errored = keys.filter((k) => ['invalid_key', 'model_unavailable', 'network_error'].includes(k.status)).length;
  const last = [...keys].sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))[0];

  return (
    <div className="space-y-4">
      <PageHeader
        title="AI Provider & API Key"
        description="Gemini Developer API dipanggil langsung dari browser Anda."
        actions={
          status === 'unlocked' && (
            <Button onClick={() => setAddOpen(true)} disabled={total >= MAX_KEYS}>
              <Plus /> Tambah key
            </Button>
          )
        }
      />
      <Alert variant="warning" title="Peringatan keamanan">
        <p>{SECURITY_WARNING}</p>
        <p className="mt-1">
          Key di browser tidak setara dengan secret di server: dapat dilihat pemilik sesi dan terdampak ekstensi atau script berbahaya. Jangan
          dipakai sebagai aplikasi publik dengan key bersama. App Check tidak melindungi panggilan langsung ke Gemini. Batasi key di Google AI
          Studio/Cloud Console (mis. referrer HTTP) bila didukung.
        </p>
        <p className="mt-1">Privasi: pada free tier, data prompt dapat diproses sesuai ketentuan Google. Jangan masukkan data rahasia klien ke brief.</p>
      </Alert>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" /> Vault
            </CardTitle>
            <CardDescription>
              <VaultBadge status={status} /> {meta && <span className="ml-1">{LABELS.vaultMode[meta.mode]}</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {status === 'uninitialized' && (
              <Button onClick={() => setSetupOpen(true)}>
                <KeyRound /> Siapkan vault
              </Button>
            )}
            {status === 'locked' && (
              <Button onClick={() => setUnlockOpen(true)}>
                <Unlock /> Buka vault
              </Button>
            )}
            {status === 'unlocked' && meta?.mode === 'persistent' && (
              <Button variant="outline" onClick={lock}>
                <Lock /> Kunci sekarang
              </Button>
            )}
            {meta && (
              <Button variant="ghost" className="text-destructive" onClick={() => setDelAll(true)}>
                <Trash2 /> Hapus Semua Key
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan key</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <p>
              Total: <strong>{total}</strong>/{MAX_KEYS}
            </p>
            <p>
              Aktif: <strong>{active}</strong>
            </p>
            <p>
              Nonaktif: <strong>{total - active}</strong>
            </p>
            <p>
              Error: <strong className={errored ? 'text-destructive' : undefined}>{errored}</strong>
            </p>
            <p className="col-span-2 text-xs text-muted-foreground">Terakhir dipakai: {last?.lastUsedAt ? `${last.label} (${formatRelative(last.lastUsedAt)})` : '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Strategi routing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Select
              value={meta?.routing ?? 'round_robin'}
              disabled={!meta}
              onChange={(e) => void setRouting(e.target.value as Routing, meta?.singleKeyId ?? keys[0]?.id)}
              aria-label="Strategi routing"
            >
              {ROUTINGS.map((r) => (
                <option key={r} value={r}>
                  {LABELS.routing[r]}
                </option>
              ))}
            </Select>
            {meta?.routing === 'single' && (
              <Select value={meta.singleKeyId ?? ''} onChange={(e) => void setRouting('single', e.target.value)} aria-label="Key terpilih">
                <option value="">— Pilih key —</option>
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </Select>
            )}
            <p className="text-xs text-muted-foreground">{ROUTING_HELP[meta?.routing ?? 'round_robin']}</p>
            <p className="text-xs text-muted-foreground">
              Round robin hanya membagi request — tidak menambah kuota. Kuota dihitung per Google Cloud project; disarankan 1–2 key.
            </p>
          </CardContent>
        </Card>
      </div>

      {status === 'locked' ? (
        <EmptyState icon={Lock} title="Vault terkunci" description="Vault terkunci. Masukkan passphrase untuk melanjutkan." action={<Button onClick={() => setUnlockOpen(true)}>Buka vault</Button>} />
      ) : status === 'uninitialized' ? (
        <EmptyState icon={KeyRound} title="Belum ada API key" description="Belum ada API key. Siapkan vault lalu tambahkan key Gemini dari Google AI Studio." action={<Button onClick={() => setSetupOpen(true)}>Siapkan vault</Button>} />
      ) : keys.length === 0 ? (
        <EmptyState icon={KeyRound} title="Belum ada API key" description="Belum ada API key. Tambahkan di sini agar fitur AI bisa dipakai." action={<Button onClick={() => setAddOpen(true)}>Tambah key</Button>} />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {keys.map((k, i) => (
            <KeyCard key={k.id} k={k} index={i} total={keys.length} todayCount={countToday(logs, k.label, Date.now())} />
          ))}
        </div>
      )}
      {meta?.mode === 'session' && <Alert variant="info" title="Mode sesi">Key hanya ada di memori tab ini dan hilang saat tab ditutup.</Alert>}

      <UsagePanel />

      <VaultSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
      <AddKeyDialog open={addOpen} onOpenChange={setAddOpen} />
      <ConfirmDialog
        open={delAll}
        onOpenChange={setDelAll}
        title="Hapus semua key?"
        description="Semua key dan pengaturan vault di browser ini dihapus permanen. Riwayat usage lokal tetap ada."
        typeToConfirm="HAPUS"
        destructive
        confirmLabel="Hapus semua"
        onConfirm={async () => {
          await deleteAll();
          toast.success('Semua key dihapus');
        }}
      />
    </div>
  );
}
