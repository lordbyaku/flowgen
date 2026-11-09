import * as React from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/misc';
import { Field } from '@/components/common/Field';
import { KeyStatusBadge } from '@/components/common/StatusBadges';
import { DEFAULT_MODEL_HINT, MAX_KEYS } from '@/config/constants';
import { KeyFormSchema } from '@/schemas/key.schema';
import { KEY_FORMAT_HINT, looksLikeGeminiKey } from '@/ai/sanitize';
import { aiService } from '@/ai/aiService';
import { localSettings, useVaultStore } from '@/vault/vaultStore';
import type { KeyStatus, KeyView } from '@/types';


function MaskedKeyInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="pr-10 font-mono"
        placeholder="AQ.… atau AIza…"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label={show ? 'Sembunyikan key' : 'Tampilkan key sementara'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ModelPicker({ keyId, value, onChange }: { keyId: string; value: string; onChange: (m: string) => void }) {
  const [models, setModels] = React.useState<string[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const r = await aiService.listModels(keyId);
    setLoading(false);
    if (r.ok) setModels(r.value);
    else setError(r.error.message);
  }, [keyId]);
  React.useEffect(() => {
    void load();
  }, [load]);
  return (
    <Field id="m-pick" label="Model" level="W" hint="Daftar diambil dari models.list (bukan hardcode)">
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Mengambil daftar model…
        </p>
      ) : models && models.length > 0 ? (
        <Select id="m-pick" value={value} onChange={(e) => onChange(e.target.value)}>
          {!models.includes(value) && <option value={value}>{value}</option>}
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      ) : (
        <>
          <Input id="m-pick" value={value} onChange={(e) => onChange(e.target.value)} placeholder={DEFAULT_MODEL_HINT} />
          {error && (
            <p className="text-xs text-destructive">
              {error}{' '}
              <button type="button" className="underline" onClick={() => void load()}>
                Coba lagi
              </button>
            </p>
          )}
        </>
      )}
    </Field>
  );
}

/** Tambah key: format → simpan lokal → daftar model → pilih model → tes koneksi → status. */
export function AddKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const addKey = useVaultStore((s) => s.addKey);
  const updateKey = useVaultStore((s) => s.updateKey);
  const keyCount = useVaultStore((s) => s.keys.length);
  const [stage, setStage] = React.useState<'form' | 'model'>('form');
  const [label, setLabel] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [keyId, setKeyId] = React.useState<string | null>(null);
  const [model, setModel] = React.useState(DEFAULT_MODEL_HINT);
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState<{ status: KeyStatus; message: string } | null>(null);

  React.useEffect(() => {
    if (open) void localSettings.get<string>('defaultModel').then((m) => m && setModel(m));
    if (!open) {
      setStage('form');
      setLabel('');
      setProjectId('');
      setApiKey('');
      setErrors({});
      setKeyId(null);
      setModel(DEFAULT_MODEL_HINT);
      setStatus(null);
    }
  }, [open]);

  const save = async () => {
    const r = KeyFormSchema.safeParse({ label, projectId, apiKey, model: DEFAULT_MODEL_HINT });
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const k = await addKey({ label: r.data.label, projectId: r.data.projectId, apiKey: r.data.apiKey, model: model || DEFAULT_MODEL_HINT });
      setApiKey(''); // plaintext tidak disimpan di state UI lebih lama dari perlu
      setKeyId(k.id);
      setStage('model');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan key.');
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    if (!keyId) return;
    setBusy(true);
    await updateKey(keyId, { model });
    const r = await aiService.testKey(keyId);
    setBusy(false);
    if (r.ok) setStatus(r.value);
    else setStatus({ status: 'network_error', message: r.error.message });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah API key Gemini</DialogTitle>
          <DialogDescription>
            Maksimal {MAX_KEYS} key ({keyCount} terpakai). Key dienkripsi dan hanya disimpan di browser ini.
          </DialogDescription>
        </DialogHeader>
        {stage === 'form' ? (
          <div className="space-y-4">
            <Field id="k-label" label="Label" level="W" error={errors.label}>
              <Input id="k-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Key pribadi 1" />
            </Field>
            <Field
              id="k-proj"
              label="Project label (Google Cloud)"
              level="W"
              error={errors.projectId}
              hint="Kuota Gemini dihitung per Google Cloud project. Key dari project yang sama ikut jeda bersama saat terkena 429."
            >
              <Input id="k-proj" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="mis. gen-lang-client-0123 atau Project A" />
            </Field>
            <Field id="k-key" label="API key" level="W" error={errors.apiKey}>
              <MaskedKeyInput id="k-key" value={apiKey} onChange={setApiKey} />
              {apiKey && !looksLikeGeminiKey(apiKey) && (
                <p className="text-xs text-warning">Format tidak seperti biasanya ({KEY_FORMAT_HINT}). Tetap bisa disimpan.</p>
              )}
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button onClick={save} loading={busy} disabled={keyCount >= MAX_KEYS}>
                Simpan & lanjut
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert variant="success" title="Key tersimpan terenkripsi">
              Pilih model lalu tes koneksi.
            </Alert>
            {keyId && <ModelPicker keyId={keyId} value={model} onChange={setModel} />}
            {status && (
              <div className="flex items-center gap-2 text-sm">
                <KeyStatusBadge status={status.status} /> {status.message}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {status ? 'Selesai' : 'Lewati tes'}
              </Button>
              <Button onClick={test} loading={busy}>
                Tes koneksi
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditKeyDialog({ keyView, onOpenChange }: { keyView: KeyView | null; onOpenChange: (v: boolean) => void }) {
  const updateKey = useVaultStore((s) => s.updateKey);
  const [label, setLabel] = React.useState('');
  const [projectId, setProjectId] = React.useState('');
  const [model, setModel] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (keyView) {
      setLabel(keyView.label);
      setProjectId(keyView.projectId);
      setModel(keyView.model);
      setApiKey('');
    }
  }, [keyView]);

  return (
    <Dialog open={!!keyView} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit key</DialogTitle>
          <DialogDescription>Kosongkan kolom key untuk tetap memakai key lama (…{keyView?.last4}).</DialogDescription>
        </DialogHeader>
        {keyView && (
          <div className="space-y-4">
            <Field id="e-label" label="Label" level="W">
              <Input id="e-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </Field>
            <Field id="e-proj" label="Project label (Google Cloud)" level="W">
              <Input id="e-proj" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
            </Field>
            <ModelPicker keyId={keyView.id} value={model} onChange={setModel} />
            <Field id="e-key" label="Ganti API key (opsional)">
              <MaskedKeyInput id="e-key" value={apiKey} onChange={setApiKey} />
            </Field>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button
                loading={busy}
                disabled={!label.trim() || !projectId.trim() || !model.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await updateKey(keyView.id, {
                      label: label.trim(),
                      projectId: projectId.trim(),
                      model: model.trim(),
                      ...(apiKey.trim() ? { apiKey } : {}),
                      ...(model !== keyView.model ? { status: 'not_tested' as const } : {}),
                    });
                    setApiKey('');
                    toast.success('Key diperbarui');
                    onOpenChange(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Gagal menyimpan.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Simpan
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
