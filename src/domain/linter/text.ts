const EN_STOPWORDS = new Set(
  'with that this from have their there they them into over under while where which what when your about above below very also only just such than then these those'.split(
    ' ',
  ),
);

/** Kata unik (huruf, >= 4 karakter), huruf kecil. */
export function uniqueWords(text: string, minLen = 4): string[] {
  const words = text.toLowerCase().match(/[a-zÀ-ɏ]+/g) ?? [];
  return [...new Set(words.filter((w) => w.length >= minLen))];
}

export function keywords(text: string): string[] {
  return uniqueWords(text).filter((w) => !EN_STOPWORDS.has(w));
}

/** Rasio kata dari `source` yang muncul di `target`. */
export function coverage(sourceWords: string[], target: string): number {
  if (sourceWords.length === 0) return 1;
  const targetSet = new Set(uniqueWords(target, 1));
  const hit = sourceWords.filter((w) => targetSet.has(w)).length;
  return hit / sourceWords.length;
}

export function stripQuoted(text: string): string {
  return text.replace(/"[^"]*"/g, ' ').replace(/“[^”]*”/g, ' ').replace(/'[^']{8,}'/g, ' ');
}

export const ID_STOPWORDS = new Set(
  'yang dan di ke dari untuk dengan ini itu adalah pada juga tidak akan bisa ada atau karena dalam oleh sudah saja agar kami kita kamu anda dia mereka sangat lebih jadi seperti sedang lagi masih harus kalau tapi namun setelah sebelum ketika saat sambil para sebuah seorang sama punya banyak buat bikin aja nggak gak udah'.split(
    ' ',
  ),
);

export function wordTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-zÀ-ɏ']+/g) ?? [];
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
