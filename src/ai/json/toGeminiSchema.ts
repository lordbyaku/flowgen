import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { isPlainObject } from '@/lib/utils';

/**
 * Konversi Zod -> subset OpenAPI yang diterima Gemini `responseSchema` [VERIFIKASI].
 * - $ref di-inline (strategi 'none'), buang $schema/additionalProperties/default.
 * - Hanya kunci whitelist yang dipertahankan; tipe ditulis huruf besar (STRING, OBJECT, ...).
 * - Union literal angka/string diubah ke enum; union lain disederhanakan ke anggota pertama.
 */
const KEEP = new Set([
  'type',
  'format',
  'description',
  'nullable',
  'enum',
  'properties',
  'required',
  'items',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
]);

type JsonSchema = Record<string, unknown>;

function simplify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(simplify);
  if (!isPlainObject(node)) return node;

  // anyOf/oneOf: gabung literal menjadi enum, atau ambil anggota pertama.
  const union = (node.anyOf ?? node.oneOf) as JsonSchema[] | undefined;
  if (Array.isArray(union) && union.length > 0) {
    const consts = union.map((u) => (u.const !== undefined ? u.const : Array.isArray(u.enum) ? u.enum : undefined));
    if (consts.every((c) => c !== undefined)) {
      const values = consts.flat();
      const isNum = values.every((v) => typeof v === 'number');
      return isNum
        ? { type: 'INTEGER', description: `One of: ${values.join(', ')}` }
        : { type: 'STRING', enum: values.map(String) };
    }
    return simplify({ ...union[0], description: node.description ?? union[0].description });
  }

  const out: JsonSchema = {};
  if (node.const !== undefined) {
    out.type = typeof node.const === 'number' ? 'INTEGER' : 'STRING';
    if (typeof node.const === 'string') out.enum = [node.const];
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    if (!KEEP.has(k)) continue;
    if (k === 'type') {
      const t = Array.isArray(v) ? v.find((x) => x !== 'null') : v;
      if (Array.isArray(v) && v.includes('null')) out.nullable = true;
      out.type = String(t).toUpperCase();
    } else if (k === 'properties' && isPlainObject(v)) {
      out.properties = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, simplify(pv)]));
    } else if (k === 'items') {
      out.items = simplify(v);
    } else if (k === 'format') {
      // Gemini hanya mengenal sebagian format; buang selain enum/date-time.
      if (v === 'enum' || v === 'date-time') out.format = v;
    } else {
      out[k] = v;
    }
  }
  if (out.type === 'OBJECT' && isPlainObject(out.properties)) {
    out.propertyOrdering = Object.keys(out.properties);
  }
  return out;
}

export function toGeminiSchema(schema: ZodTypeAny): object {
  const json = zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }) as JsonSchema;
  return simplify(json) as object;
}
