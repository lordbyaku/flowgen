import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@/components/ui/button';
import { writeClipboard } from '@/domain/exporters/clipboard';

export function CopyButton({
  getText,
  label = 'Salin',
  onCopied,
  ...props
}: Omit<ButtonProps, 'onClick'> & { getText: () => string; label?: string; onCopied?: () => void }) {
  const [done, setDone] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      {...props}
      onClick={async () => {
        const text = getText();
        if (!text.trim()) {
          toast.error('Tidak ada teks untuk disalin.');
          return;
        }
        if (await writeClipboard(text)) {
          setDone(true);
          toast.success('Disalin ke clipboard');
          onCopied?.();
          setTimeout(() => setDone(false), 1500);
        } else toast.error('Gagal menyalin. Izinkan akses clipboard di browser.');
      }}
    >
      {done ? <Check /> : <Copy />}
      {label}
    </Button>
  );
}
