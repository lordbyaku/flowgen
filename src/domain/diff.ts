export interface DiffToken {
  text: string;
  type: 'same' | 'added' | 'removed';
}

/** Diff per kata (LCS). Cukup untuk prompt ≤ ~600 kata. */
export function diffWords(a: string, b: string): DiffToken[] {
  const x = a.split(/(\s+)/).filter((t) => t !== '');
  const y = b.split(/(\s+)/).filter((t) => t !== '');
  const n = x.length;
  const m = y.length;
  if (n * m > 1_000_000) return [{ text: a, type: 'removed' }, { text: b, type: 'added' }];
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--) dp[i][j] = x[i] === y[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffToken[] = [];
  let i = 0;
  let j = 0;
  const push = (text: string, type: DiffToken['type']) => {
    const last = out[out.length - 1];
    if (last && last.type === type) last.text += text;
    else out.push({ text, type });
  };
  while (i < n && j < m) {
    if (x[i] === y[j]) {
      push(x[i], 'same');
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push(x[i++], 'removed');
    else push(y[j++], 'added');
  }
  while (i < n) push(x[i++], 'removed');
  while (j < m) push(y[j++], 'added');
  return out;
}
