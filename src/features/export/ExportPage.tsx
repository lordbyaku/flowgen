import * as React from 'react';
import { Download, FileJson } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { CopyButton } from '@/components/common/CopyButton';
import { SingleToggle } from '@/components/common/ToggleGroup';
import { LABELS } from '@/config/enums';
import { EXPORT_SECTIONS, EXPORT_SECTION_LABELS, toExportBundle, type ExportSection } from '@/domain/exporters/bundle';
import { clipboardText, type ClipboardKind } from '@/domain/exporters/clipboard';
import { toMarkdown } from '@/domain/exporters/markdown';
import { exportFilename, projectToJson } from '@/domain/exporters/projectJson';
import { promptsTxt, scenePromptTxt, voTxt } from '@/domain/exporters/txt';
import { downloadText } from '@/lib/download';
import { useProjectStore } from '@/stores/projectStore';
import type { Variant } from '@/types';

type Format = 'md' | 'txt' | 'clipboard';
type TxtKind = 'prompts' | 'scene' | 'vo';

export default function ExportPage() {
  const project = useProjectStore((s) => s.project)!;
  const docs = useProjectStore((s) => s.docs);
  const bundle = React.useMemo(() => toExportBundle(project, docs), [project, docs]);
  const [sections, setSections] = React.useState<ExportSection[]>([...EXPORT_SECTIONS]);
  const [format, setFormat] = React.useState<Format>('md');
  const [txtKind, setTxtKind] = React.useState<TxtKind>('prompts');
  const [sceneId, setSceneId] = React.useState(bundle.scenes[0]?.id ?? '');
  const [variant, setVariant] = React.useState<Variant>('standard');
  const [clipKind, setClipKind] = React.useState<ClipboardKind>('allPrompts');

  const output = (): { text: string; filename: string } => {
    if (format === 'md')
      return { text: toMarkdown(bundle, sections, { lintDisabled: project.lintDisabled }), filename: exportFilename(project.name, 'paket', 'md') };
    if (format === 'txt') {
      if (txtKind === 'vo') return { text: voTxt(bundle), filename: exportFilename(project.name, 'vo', 'txt') };
      if (txtKind === 'scene') {
        const idx = bundle.scenes.findIndex((s) => s.id === sceneId);
        const s = bundle.scenes[idx];
        return { text: s ? scenePromptTxt(s, idx, variant) + '\n' : '', filename: exportFilename(project.name, `scene-${idx + 1}`, 'txt') };
      }
      return { text: promptsTxt(bundle, variant), filename: exportFilename(project.name, 'prompts', 'txt') };
    }
    return {
      text: clipboardText(bundle, clipKind, { scene: bundle.scenes.find((s) => s.id === sceneId), variant }),
      filename: '',
    };
  };

  const preview = output().text;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Export Center</h2>
        <p className="text-sm text-muted-foreground">Ekspor tidak pernah memuat API key atau kredensial lokal.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit">
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Format</p>
              <SingleToggle
                options={[
                  { value: 'md', label: 'Markdown' },
                  { value: 'txt', label: 'TXT' },
                  { value: 'clipboard', label: 'Clipboard' },
                ]}
                value={format}
                clearable={false}
                onChange={(v) => v && setFormat(v)}
                ariaLabel="Format ekspor"
              />
            </div>
            {format === 'md' && (
              <fieldset className="space-y-1.5">
                <legend className="text-sm font-medium">Bagian</legend>
                {EXPORT_SECTIONS.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sections.includes(s)}
                      onChange={(e) => setSections(e.target.checked ? [...sections, s] : sections.filter((x) => x !== s))}
                    />
                    {EXPORT_SECTION_LABELS[s]}
                  </label>
                ))}
              </fieldset>
            )}
            {format === 'txt' && (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Isi</span>
                <Select value={txtKind} onChange={(e) => setTxtKind(e.target.value as TxtKind)}>
                  <option value="prompts">Semua prompt</option>
                  <option value="scene">Prompt per scene</option>
                  <option value="vo">Naskah VO</option>
                </Select>
              </label>
            )}
            {format === 'clipboard' && (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Isi</span>
                <Select value={clipKind} onChange={(e) => setClipKind(e.target.value as ClipboardKind)}>
                  <option value="scene">Satu scene</option>
                  <option value="allPrompts">Semua prompt</option>
                  <option value="storyboard">Storyboard</option>
                  <option value="script">Naskah</option>
                  <option value="capcut">Panduan edit</option>
                </Select>
              </label>
            )}
            {((format === 'txt' && txtKind === 'scene') || (format === 'clipboard' && clipKind === 'scene')) && (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Scene</span>
                <Select value={sceneId} onChange={(e) => setSceneId(e.target.value)}>
                  {bundle.scenes.map((s, i) => (
                    <option key={s.id} value={s.id}>
                      {i + 1}. {s.title}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {format !== 'md' && project.brief.output.variants.length > 1 && (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Varian prompt</span>
                <Select value={variant} onChange={(e) => setVariant(e.target.value as Variant)}>
                  {project.brief.output.variants.map((v) => (
                    <option key={v} value={v}>
                      {LABELS.variant[v]}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {format === 'clipboard' ? (
              <CopyButton label="Salin ke clipboard" className="w-full" size="default" variant="default" getText={() => output().text} />
            ) : (
              <Button
                className="w-full"
                onClick={() => {
                  const o = output();
                  if (!o.text.trim()) return toast.error('Tidak ada isi untuk diekspor.');
                  downloadText(o.filename, o.text, format === 'md' ? 'text/markdown;charset=utf-8' : undefined);
                }}
              >
                <Download /> Unduh .{format}
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pratinjau</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="prose-prompt max-h-[60vh] overflow-auto rounded-md bg-muted p-3">{preview || '— kosong —'}</pre>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-4 w-4" /> Ekspor project (JSON)
          </CardTitle>
          <CardDescription>Cadangan lengkap project ini; dapat diimpor kembali dari Settings. Tanpa key.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => downloadText(exportFilename(project.name, 'project', 'json'), projectToJson(bundle), 'application/json')}>
            <Download /> Unduh JSON
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
