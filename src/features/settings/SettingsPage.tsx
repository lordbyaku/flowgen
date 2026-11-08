import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, KeyRound, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Label, Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { SingleToggle } from '@/components/common/ToggleGroup';
import { PageHeader } from '@/components/common/states';
import { APP_VERSION, DEFAULT_MODEL_HINT, MAX_SCENE_SEC } from '@/config/constants';
import { LABELS } from '@/config/enums';
import { isDemoMode } from '@/config/env';
import { getProjectDocs, importProject, listAllProjects } from '@/data/projectRepo';
import { getPreferences, savePreferences } from '@/data/templateRepo';
import { readOps } from '@/data/opsCounter';
import { toExportBundle } from '@/domain/exporters/bundle';
import { parseProjectJson, projectToJson } from '@/domain/exporters/projectJson';
import { downloadText } from '@/lib/download';
import { yyyymmdd } from '@/lib/format';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore, type ThemePref } from '@/stores/uiStore';
import { localSettings, useVaultStore } from '@/vault/vaultStore';
import { PassphraseInput, StrengthMeter } from '@/features/provider/VaultDialogs';

function ChangePassphraseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const change = useVaultStore((s) => s.changePassphrase);
  const [oldP, setOldP] = React.useState('');
  const [newP, setNewP] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganti passphrase</DialogTitle>
          <DialogDescription>Semua key dienkripsi ulang dengan kunci baru dalam satu transaksi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cp-old">Passphrase lama</Label>
            <PassphraseInput id="cp-old" value={oldP} onChange={setOldP} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-new">Passphrase baru</Label>
            <PassphraseInput id="cp-new" value={newP} onChange={setNewP} autoComplete="new-password" />
            <StrengthMeter value={newP} />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const r = await change(oldP, newP);
              setBusy(false);
              if (!r.ok) return setErr(r.message ?? 'Gagal.');
              setOldP('');
              setNewP('');
              toast.success('Passphrase diganti');
              onOpenChange(false);
            }}
          >
            Ganti
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SwitchModeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const meta = useVaultStore((s) => s.meta);
  const switchMode = useVaultStore((s) => s.switchMode);
  const [pass, setPass] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const target = meta?.mode === 'session' ? 'persistent' : 'session';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganti mode vault ke {LABELS.vaultMode[target]}</DialogTitle>
          <DialogDescription>
            {target === 'session'
              ? 'Key dipindahkan ke memori dan dihapus dari IndexedDB. Saat tab ditutup, semua key hilang dan harus ditambahkan ulang.'
              : 'Key yang ada sekarang dienkripsi dengan passphrase baru dan disimpan di IndexedDB.'}
          </DialogDescription>
        </DialogHeader>
        {target === 'persistent' && (
          <div className="space-y-1.5">
            <Label htmlFor="sm-pass">Passphrase baru</Label>
            <PassphraseInput id="sm-pass" value={pass} onChange={setPass} autoComplete="new-password" />
            <StrengthMeter value={pass} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const r = await switchMode(target, pass);
              setBusy(false);
              if (!r.ok) return toast.error(r.message ?? 'Gagal.');
              setPass('');
              toast.success('Mode vault diganti');
              onOpenChange(false);
            }}
          >
            Ganti mode
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SettingsPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const { meta, status, autoLockMs, setAutoLockMs, deleteAll } = useVaultStore();
  const navigate = useNavigate();
  const [defaultModel, setDefaultModel] = React.useState(DEFAULT_MODEL_HINT);
  const [budget, setBudget] = React.useState(0);
  const [pp, setPp] = React.useState(false);
  const [mode, setMode] = React.useState(false);
  const [delAll, setDelAll] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const ops = readOps();

  React.useEffect(() => {
    void localSettings.get<string>('defaultModel').then((m) => m && setDefaultModel(m));
    if (uid) void getPreferences(uid).then((p) => setBudget(p.dailyCallBudget)).catch(() => undefined);
  }, [uid]);

  const exportAll = async () => {
    if (!uid) return;
    setExporting(true);
    try {
      const projects = await listAllProjects(uid);
      const files = [];
      for (const p of projects) {
        const { docs } = await getProjectDocs(uid, p.id);
        files.push(JSON.parse(projectToJson(toExportBundle(p, docs))));
      }
      downloadText(`avps-semua-project-${yyyymmdd()}.json`, JSON.stringify({ format: 'avps-project-bundle', projects: files }, null, 2), 'application/json');
      toast.success(`${projects.length} project diekspor (tanpa key)`);
    } catch {
      toast.error('Gagal mengekspor.');
    } finally {
      setExporting(false);
    }
  };

  const importFile = async (f: File) => {
    if (!uid) return;
    const text = await f.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return toast.error('File bukan JSON yang valid.');
    }
    const list =
      typeof parsed === 'object' && parsed && (parsed as { format?: string }).format === 'avps-project-bundle'
        ? ((parsed as { projects: unknown[] }).projects ?? []).map((p) => JSON.stringify(p))
        : [text];
    let ok = 0;
    for (const item of list) {
      const r = parseProjectJson(item);
      if (!r.ok) {
        toast.error(r.message);
        continue;
      }
      await importProject(uid, { name: r.file.project.name, brief: r.file.project.brief, docs: r.file.docs });
      ok++;
    }
    if (ok) {
      toast.success(`${ok} project diimpor`);
      navigate('/projects');
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Preferensi aplikasi, vault, dan data." />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tampilan & AI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Tema</p>
              <SingleToggle<ThemePref>
                options={[
                  { value: 'system', label: 'Ikuti sistem' },
                  { value: 'light', label: 'Terang' },
                  { value: 'dark', label: 'Gelap' },
                ]}
                value={theme}
                clearable={false}
                onChange={(v) => v && setTheme(v)}
                ariaLabel="Tema"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-model">Model default untuk key baru</Label>
              <div className="flex gap-2">
                <Input id="s-model" value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} />
                <Button
                  variant="outline"
                  onClick={async () => {
                    await localSettings.set('defaultModel', defaultModel.trim() || DEFAULT_MODEL_HINT);
                    toast.success('Disimpan');
                  }}
                >
                  Simpan
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Hanya fallback. Model sebenarnya dipilih per key dari daftar models.list.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-budget">Peringatan anggaran panggilan AI harian (0 = nonaktif)</Label>
              <div className="flex gap-2">
                <Input id="s-budget" type="number" min={0} value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))} />
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (!uid) return;
                    await savePreferences(uid, { dailyCallBudget: budget });
                    toast.success('Disimpan');
                  }}
                >
                  Simpan
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Dashboard menampilkan peringatan bila request lokal hari ini melewati ambang ini.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Vault
            </CardTitle>
            <CardDescription>{meta ? `Mode: ${LABELS.vaultMode[meta.mode]} · ${status === 'unlocked' ? 'terbuka' : 'terkunci'}` : 'Belum disiapkan'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={!meta || status !== 'unlocked'} onClick={() => setMode(true)}>
                Ganti mode vault
              </Button>
              <Button variant="outline" disabled={meta?.mode !== 'persistent'} onClick={() => setPp(true)}>
                Ganti passphrase
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-lock">Auto-lock setelah tidak aktif</Label>
              <Select id="s-lock" value={String(autoLockMs)} onChange={(e) => void setAutoLockMs(Number(e.target.value))}>
                {[5, 15, 30, 60, 120].map((m) => (
                  <option key={m} value={m * 60_000}>
                    {m} menit
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="ghost" className="text-destructive" disabled={!meta} onClick={() => setDelAll(true)}>
              Hapus Semua Key
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data project</CardTitle>
            <CardDescription>Ekspor dan impor tidak pernah memuat API key.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={exportAll} loading={exporting}>
                <Download /> Ekspor semua project (JSON)
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload /> Impor project (JSON)
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importFile(f);
                  e.target.value = '';
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Audit {isDemoMode ? 'penyimpanan lokal' : 'Firestore'} hari ini (tab ini): {ops.reads} read · {ops.writes} write. Kuota Spark: 50.000 read & 20.000 write per hari.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tentang</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              AI Video Prompt Studio <strong>v{APP_VERSION}</strong>
              {isDemoMode && ' · Mode Demo Lokal'}
            </p>
            <Alert variant="info" title="Batasan">
              <ul className="list-disc space-y-0.5 pl-4">
                <li>Aplikasi tidak membuat, merender, mengedit, atau memublikasikan video.</li>
                <li>Tanpa backend: Gemini dipanggil langsung dari browser dengan key Anda.</li>
                <li>Tidak ada integrasi otomatis ke Google Flow atau CapCut.</li>
                <li>Durasi scene maks {MAX_SCENE_SEC} detik (verifikasi batas terbaru di Flow).</li>
                <li>Aplikasi pribadi satu pemilik; bukan SaaS multi-user.</li>
              </ul>
            </Alert>
          </CardContent>
        </Card>
      </div>
      <ChangePassphraseDialog open={pp} onOpenChange={setPp} />
      <SwitchModeDialog open={mode} onOpenChange={setMode} />
      <ConfirmDialog
        open={delAll}
        onOpenChange={setDelAll}
        title="Hapus semua key?"
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
