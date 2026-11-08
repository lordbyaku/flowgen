import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { ChipInput } from '@/components/common/ChipInput';
import { Field } from '@/components/common/Field';
import { ErrorState, LoadingState, PageHeader } from '@/components/common/states';
import { BrandFormSchema } from '@/schemas/project.schema';
import { createBrand, getBrand, updateBrand } from '@/data/brandRepo';
import { useAuthStore } from '@/stores/authStore';

type Form = z.input<typeof BrandFormSchema>;

const EMPTY: Form = {
  name: '',
  industry: '',
  tagline: '',
  description: '',
  colors: [],
  logoDescription: '',
  toneOfVoice: '',
  targetMarket: '',
  website: '',
  socials: '',
  dos: [],
  donts: [],
};

export default function BrandEditorPage() {
  const { id } = useParams();
  const isNew = id === 'new';
  const uid = useAuthStore((s) => s.user?.uid);
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(!isNew);
  const [notFound, setNotFound] = React.useState(false);
  const form = useForm<Form>({ resolver: zodResolver(BrandFormSchema), defaultValues: EMPTY });
  const { register, handleSubmit, control, formState, reset } = form;

  React.useEffect(() => {
    if (isNew || !uid || !id) return;
    void getBrand(uid, id).then((b) => {
      if (!b) setNotFound(true);
      else {
        const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = b;
        reset(rest);
      }
      setLoading(false);
    });
  }, [id, isNew, uid, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!uid) return;
    const data = BrandFormSchema.parse(values);
    try {
      if (isNew) await createBrand(uid, data);
      else await updateBrand(uid, id!, data);
      toast.success('Brand disimpan');
      navigate('/brands');
    } catch {
      toast.error('Gagal menyimpan brand. Coba lagi.');
    }
  });

  if (loading) return <LoadingState />;
  if (notFound) return <ErrorState title="Brand tidak ditemukan" />;

  const err = formState.errors;
  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isNew ? 'Brand baru' : 'Edit brand'}
        description="Informasi ini dikirim ke AI sebagai konteks brand."
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => navigate('/brands')}>
              Batal
            </Button>
            <Button type="submit" loading={formState.isSubmitting}>
              Simpan
            </Button>
          </>
        }
      />
      <Card>
        <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
          <Field id="b-name" label="Nama brand" level="W" error={err.name?.message}>
            <Input id="b-name" placeholder="mis. Warungku" {...register('name')} aria-invalid={!!err.name} />
          </Field>
          <Field id="b-industry" label="Industri" hint="Bidang usaha brand">
            <Input id="b-industry" placeholder="mis. Software kasir UMKM" {...register('industry')} />
          </Field>
          <Field id="b-tagline" label="Tagline">
            <Input id="b-tagline" placeholder="mis. Kasir rapi dari HP" {...register('tagline')} />
          </Field>
          <Field id="b-tone" label="Tone of voice" hint="Cara brand berbicara">
            <Input id="b-tone" placeholder="mis. Ramah, santai, membantu" {...register('toneOfVoice')} />
          </Field>
          <Field id="b-desc" label="Deskripsi brand" className="md:col-span-2">
            <Textarea id="b-desc" placeholder="Cerita singkat brand, nilai, dan positioning" {...register('description')} />
          </Field>
          <Field id="b-colors" label="Warna brand" hint="Hex atau nama warna, maks 6" error={err.colors?.message}>
            <Controller
              control={control}
              name="colors"
              render={({ field }) => <ChipInput id="b-colors" value={field.value ?? []} onChange={field.onChange} max={6} placeholder="#16a34a" />}
            />
          </Field>
          <Field id="b-logo" label="Deskripsi logo" hint="Bentuk, warna, dan posisi logo — membantu AI menjaga logo">
            <Textarea id="b-logo" placeholder="mis. Ikon keranjang hijau dengan tulisan Warungku" {...register('logoDescription')} />
          </Field>
          <Field id="b-market" label="Target pasar">
            <Input id="b-market" placeholder="mis. Pemilik warung di kota kecil" {...register('targetMarket')} />
          </Field>
          <Field id="b-web" label="Website" error={err.website?.message}>
            <Input id="b-web" placeholder="https://…" {...register('website')} aria-invalid={!!err.website} />
          </Field>
          <Field id="b-social" label="Sosial media">
            <Input id="b-social" placeholder="@warungku" {...register('socials')} />
          </Field>
          <div />
          <Field id="b-dos" label="Selalu lakukan (do)">
            <Controller
              control={control}
              name="dos"
              render={({ field }) => <ChipInput id="b-dos" value={field.value ?? []} onChange={field.onChange} max={20} placeholder="mis. Tampilkan logo di akhir" />}
            />
          </Field>
          <Field id="b-donts" label="Jangan lakukan (don't)">
            <Controller
              control={control}
              name="donts"
              render={({ field }) => <ChipInput id="b-donts" value={field.value ?? []} onChange={field.onChange} max={20} placeholder="mis. Jangan bandingkan kompetitor" />}
            />
          </Field>
        </CardContent>
      </Card>
    </form>
  );
}
