import { BrandSchema } from '@/schemas/project.schema';
import { newId } from '@/lib/ids';
import type { Brand } from '@/types';
import { getBackend, paths } from './index';
import { parseStored } from './converters';

export type BrandInput = Omit<Brand, 'id' | 'createdAt' | 'updatedAt'>;

export async function listBrands(uid: string): Promise<Brand[]> {
  const res = await getBackend().list(paths.brands(uid), { orderByUpdated: true, limit: 100 });
  return res.items.flatMap(({ id, data }) => {
    const p = parseStored(BrandSchema, { ...data, id });
    return p.ok ? [p.value] : [];
  });
}

export async function getBrand(uid: string, id: string): Promise<Brand | null> {
  const data = await getBackend().get(paths.brand(uid, id));
  if (!data) return null;
  const p = parseStored(BrandSchema, { ...data, id });
  return p.ok ? p.value : null;
}

export async function createBrand(uid: string, input: BrandInput): Promise<Brand> {
  const now = Date.now();
  const brand = BrandSchema.parse({ ...input, id: `brand_${newId()}`, createdAt: now, updatedAt: now });
  await getBackend().set(paths.brand(uid, brand.id), brand);
  return brand;
}

export async function updateBrand(uid: string, id: string, input: BrandInput): Promise<void> {
  await getBackend().update(paths.brand(uid, id), { ...input, updatedAt: Date.now() });
}

export async function deleteBrand(uid: string, id: string): Promise<void> {
  await getBackend().delete(paths.brand(uid, id));
}

export async function duplicateBrand(uid: string, brand: Brand): Promise<Brand> {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = brand;
  return createBrand(uid, { ...rest, name: `${brand.name} (salinan)` });
}
