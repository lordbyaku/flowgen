import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/states';
import { MapPinOff } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={MapPinOff}
      title="Halaman tidak ditemukan"
      description="Alamat yang Anda buka tidak ada atau sudah dipindahkan."
      action={
        <Button asChild>
          <Link to="/">Kembali ke Dashboard</Link>
        </Button>
      }
    />
  );
}
