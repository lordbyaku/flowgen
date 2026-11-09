import * as React from 'react';
import { Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Alert, Progress } from '@/components/ui/misc';
import { PASSPHRASE_MIN_LENGTH } from '@/config/constants';
import { passphraseStrength as passphraseStrengthLabel, useVaultStore } from '@/vault/vaultStore';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

export const CLOUD_WARNING =
  'Key disimpan sebagai teks biasa di Firestore akun Anda dan hanya bisa dibaca akun Anda (Security Rules). Siapa pun yang berhasil masuk ke akun ini, atau yang punya akses ke Firebase Console project ini, bisa membaca key. Gunakan password akun yang kuat dan batasi key di Google Cloud Console.';

export const SECURITY_WARNING =
  'Key disimpan di browser ini saja dan terenkripsi dengan passphrase Anda. Enkripsi ini tidak melindungi dari script berbahaya di aplikasi yang sama. Jangan pakai di komputer bersama. Menghapus data browser akan menghapus key.';

export function PassphraseInput({
  id,
  value,
  onChange,
  autoFocus,
  autoComplete = 'current-password',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        spellCheck={false}
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Sembunyikan passphrase' : 'Tampilkan passphrase'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function StrengthMeter({ value }: { value: string }) {
  const s = passphraseStrengthLabel(value);
  return (
    <div className="space-y-1">
      <Progress value={(s.score / 4) * 100} label="Kekuatan passphrase" className={cn(s.score < 2 && '[&>div]:bg-destructive')} />
      <p className="text-xs text-muted-foreground">Kekuatan: {s.label}</p>
    </div>
  );
}

export function VaultSetupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const setup = useVaultStore((s) => s.setup);
  const [mode, setMode] = React.useState<'persistent' | 'session' | 'cloud'>('cloud');
  const [cloudAck, setCloudAck] = React.useState(false);
  const [p1, setP1] = React.useState('');
  const [p2, setP2] = React.useState('');
  const [ack, setAck] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const valid =
    mode === 'session' || (mode === 'cloud' && cloudAck) || (mode === 'persistent' && p1.length >= PASSPHRASE_MIN_LENGTH && p1 === p2 && ack);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'persistent' && p1 !== p2) return setError('Passphrase tidak sama.');
    setBusy(true);
    const r = await setup({ mode, passphrase: p1 });
    setBusy(false);
    if (!r.ok) return setError(r.message ?? 'Gagal menyiapkan vault.');
    setP1('');
    setP2('');
    toast.success(
      mode === 'persistent'
        ? 'Vault terenkripsi siap.'
        : mode === 'cloud'
          ? 'Key akan tersimpan di akun dan tersedia di semua device.'
          : 'Mode sesi aktif. Key hilang saat tab ditutup.',
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Siapkan Vault API Key
            </DialogTitle>
            <DialogDescription>Pilih cara menyimpan API key Gemini di browser ini.</DialogDescription>
          </DialogHeader>
          <div role="radiogroup" aria-label="Mode vault" className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ['cloud', 'Tersimpan di akun', 'Key disimpan di akun Anda dan otomatis muncul di semua device setelah login. Tanpa passphrase.'],
                ['persistent', 'Terenkripsi di browser', 'Key terenkripsi di browser ini saja. Butuh passphrase tiap sesi.'],
                ['session', 'Hanya sesi', 'Key disimpan di memori dan hilang saat tab ditutup.'],
              ] as const
            ).map(([v, t, d]) => (
              <button
                type="button"
                role="radio"
                aria-checked={mode === v}
                key={v}
                onClick={() => setMode(v)}
                className={cn(
                  'rounded-lg border p-3 text-left text-sm',
                  mode === v ? 'border-primary bg-primary/5' : 'hover:bg-muted',
                )}
              >
                <p className="font-medium">{t}</p>
                <p className="mt-1 text-xs text-muted-foreground">{d}</p>
              </button>
            ))}
          </div>
          {mode === 'cloud' && (
            <div className="space-y-3">
              <Alert variant="warning" title="Key disimpan tanpa enkripsi di akun Anda">
                {CLOUD_WARNING}
              </Alert>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={cloudAck} onChange={(e) => setCloudAck(e.target.checked)} />
                Saya mengerti risikonya dan ingin key tersinkron di semua device.
              </label>
            </div>
          )}
          {mode === 'persistent' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp1">Passphrase (min. {PASSPHRASE_MIN_LENGTH} karakter)</Label>
                <PassphraseInput id="pp1" value={p1} onChange={setP1} autoFocus autoComplete="new-password" />
                <StrengthMeter value={p1} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp2">Ulangi passphrase</Label>
                <PassphraseInput id="pp2" value={p2} onChange={setP2} autoComplete="new-password" />
              </div>
              <Alert variant="warning" title="Passphrase TIDAK dapat dipulihkan">
                Jika lupa, satu-satunya jalan adalah Hapus Semua Key lalu menambahkan ulang.
              </Alert>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                Saya mengerti passphrase tidak dapat dipulihkan.
              </label>
            </div>
          )}
          {mode !== 'cloud' && (
            <Alert variant="info" title="Catatan keamanan">
              {SECURITY_WARNING}
            </Alert>
          )}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={!valid} loading={busy}>
              Siapkan vault
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VaultUnlockDialog() {
  const open = useUiStore((s) => s.unlockOpen);
  const setOpen = useUiStore((s) => s.setUnlockOpen);
  const unlock = useVaultStore((s) => s.unlock);
  const lockoutUntil = useVaultStore((s) => s.lockoutUntil);
  const [pass, setPass] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [, force] = React.useState(0);

  React.useEffect(() => {
    if (lockoutUntil <= Date.now()) return;
    const t = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [lockoutUntil]);

  const wait = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await unlock(pass);
    setBusy(false);
    if (r.ok) {
      setPass('');
      setError(null);
      setOpen(false);
      toast.success('Vault terbuka.');
    } else setError(r.message ?? 'Gagal membuka vault.');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Buka Vault
            </DialogTitle>
            <DialogDescription>Vault terkunci. Masukkan passphrase untuk melanjutkan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="unlock-pass">Passphrase</Label>
            <PassphraseInput id="unlock-pass" value={pass} onChange={setPass} autoFocus />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          {wait > 0 && <p className="text-sm text-warning">Tunggu {wait} detik sebelum mencoba lagi.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={busy} disabled={!pass || wait > 0}>
              Buka
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
