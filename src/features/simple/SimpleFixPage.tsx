import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/input';
import { Field } from '@/components/common/Field';
import { PageHeader } from '@/components/common/states';
import { FixPanel } from './FixPanel';

export default function SimpleFixPage() {
  const [prompt, setPrompt] = React.useState('');
  const [usesAssets, setUsesAssets] = React.useState(false);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader title="Perbaiki Hasil" description="Video dari Flow tidak sesuai? Tempel prompt-nya, pilih masalahnya, dapat prompt baru atau instruksi edit Omni." />
      <Card>
        <CardContent className="space-y-4 pt-4">
          <Field id="sf-prompt" label="Prompt yang dipakai di Flow">
            <Textarea id="sf-prompt" rows={6} value={prompt} maxLength={3000} onChange={(e) => setPrompt(e.target.value)} placeholder="Tempel prompt di sini" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={usesAssets} onChange={(e) => setUsesAssets(e.target.checked)} />
            Prompt menyebut aset Flow (tokoh/produk dilampirkan sebagai gambar)
          </label>
          <FixPanel prompt={prompt} usesAssets={usesAssets} />
        </CardContent>
      </Card>
    </div>
  );
}
