export type ExtractResult = { ok: true; value: unknown } | { ok: false; error: string };

/** Buang pagar kode, ambil dari `{` pertama sampai `}` terakhir, lalu JSON.parse. */
export function extractJson(raw: string): ExtractResult {
  let text = raw.trim();
  const fence = /```(?:json|JSON)?\s*([\s\S]*?)```/.exec(text);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: 'Tidak ditemukan objek JSON.' };
  try {
    return { ok: true, value: JSON.parse(text.slice(start, end + 1)) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'JSON tidak valid.' };
  }
}
