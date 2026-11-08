// E2E (P2-08): alur brief hingga export dengan Gemini dipalsukan lewat intersepsi jaringan.
// Jalankan: pnpm test:e2e  (Mode Demo Lokal, tanpa Firebase dan tanpa key asli)
import { expect, test, type Page, type Route } from '@playwright/test';

const FAKE_KEY = 'AIza' + 'Sy' + 'E2EE2EE2EE2EE2EE2EE2EE2EE2EE2EE2E';

function geminiJson(obj: unknown) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 200 },
  };
}

const scene = (order: number, title: string) => ({
  order,
  title,
  durationSec: order < 3 ? 8 : 6,
  purpose: 'p',
  visualDescription: 'Woman at warung counter',
  characterIds: ['char_1'],
  characterAction: 'taps phone',
  environment: 'warung',
  shot: 'medium',
  cameraMovement: 'push-in',
  lighting: 'window light',
  transition: 'cut',
  voiceOver: 'Kasir rapi dari HP.',
  dialogue: '',
  sfxAmbient: 'warung ambience',
  textOverlay: 'Kasir rapi!',
});

async function mockGemini(page: Page) {
  await page.route('https://generativelanguage.googleapis.com/**', async (route: Route) => {
    const url = route.request().url();
    expect(url).not.toContain(FAKE_KEY);
    if (url.includes('/models?')) return route.fulfill({ json: { models: [{ name: 'models/gemini-test', supportedGenerationMethods: ['generateContent'] }] } });
    if (!url.includes(':generateContent')) return route.fulfill({ json: { name: 'models/gemini-test' } });
    const body = route.request().postDataJSON() as { contents: { parts: { text: string }[] }[] };
    const prompt = body.contents[0].parts[0].text;
    if (prompt.includes('Call 1'))
      return route.fulfill({
        json: geminiJson({
          analysis: { product: 'Produk', market: 'Pasar', strongestAngle: 'Masalah ke solusi' },
          concepts: [1, 2, 3].map((i) => ({ title: `Konsep ${i}`, angle: 'problem_solution', coreMessage: 'cm', emotion: 'lega', visualIdentity: 'v', storytelling: 's', openingHook: 'h', closingCta: 'c', recommendedSceneCount: 4, rationale: 'r' })),
          assumptions: [],
        }),
      });
    if (prompt.includes('Call 2'))
      return route.fulfill({
        json: geminiJson({
          script: { hook: 'h', problem: 'p', productIntro: 'i', mainBenefit: 'b', closing: 'c', cta: 'cta', voiceOver: 'VO', estimatedDurationSec: 25, wordCount: 1 },
          scenes: [scene(0, 'Hook'), scene(1, 'Masalah'), scene(2, 'Demo'), scene(3, 'CTA')],
          characterBibles: [{ id: 'char_1', name: 'Bu Sari', genderPresentation: 'female', approxAge: '38', appearance: 'oval', hair: 'hijab', clothing: 'batik', accessories: '', personality: 'ramah', restrictions: '', masterDescriptionEn: 'Bu Sari, a warm Indonesian woman wearing a cream hijab and blue batik shirt.' }],
          visualBible: { artDirection: 'a', palette: ['#16a34a'], lightingStyle: 'l', cinematography: 'c', environmentDesign: 'e', lensPreference: '35mm', cameraMovementStyle: 'm', productAppearanceEn: 'Android phone showing green cashier app.', restrictions: '', styleLineEn: 'Photoreal UGC.' },
          assumptions: [],
        }),
      });
    const ids = [...prompt.matchAll(/sceneId: (\S+)/g)].map((m) => m[1]);
    return route.fulfill({
      json: geminiJson({
        prompts: ids.map((id) => ({ sceneId: id, standard: `Bu Sari, a warm Indonesian woman wearing a cream hijab and blue batik shirt, taps an Android phone showing green cashier app. Aspect ratio 9:16. ${id}`, negativePrompt: 'blur' })),
        capcut: { sceneOrder: ['Hook', 'Masalah', 'Demo', 'CTA'], timeline: [], voiceOverSequence: ['VO'], musicMood: 'ceria', sfx: [], transitions: ['cut'], rhythm: 'cepat', textOverlays: [], opening: 'o', closing: 'c' },
      }),
    });
  });
}

test('alur brief → konsep → naskah → prompt → export', async ({ page }) => {
  await mockGemini(page);
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Masuk ke Mode Demo' }).click();

  // Brand
  await page.goto('/brands/new');
  await page.locator('#b-name').fill('Warungku');
  await page.getByRole('button', { name: 'Simpan' }).click();

  // Vault + key (mode sesi)
  await page.goto('/provider');
  await page.getByRole('button', { name: 'Siapkan vault' }).first().click();
  await page.getByRole('radio', { name: /Hanya sesi/ }).click();
  await page.getByRole('button', { name: 'Siapkan vault' }).last().click();
  await page.getByRole('button', { name: 'Tambah key' }).first().click();
  await page.locator('#k-label').fill('Key E2E');
  await page.locator('#k-proj').fill('ProjE2E');
  await page.locator('#k-key').fill(FAKE_KEY);
  await page.getByRole('button', { name: 'Simpan & lanjut' }).click();
  await page.getByRole('button', { name: 'Tes koneksi' }).click();
  await expect(page.getByText('Terhubung').first()).toBeVisible();
  await page.getByRole('button', { name: 'Selesai' }).click();

  // Project dari preset SaaS — navigasi di dalam aplikasi (mode sesi: reload menghapus key)
  await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: 'Projects' }).click();
  await page.getByRole('link', { name: /Project baru/ }).first().click();
  await page.getByRole('radio', { name: /Software\/SaaS UMKM/ }).click();
  await page.getByRole('button', { name: 'Buat & isi brief' }).click();
  await page.waitForURL(/\/brief/);
  // Lengkapi field W karakter
  await page.getByRole('navigation', { name: 'Langkah brief' }).getByRole('button', { name: /Karakter/ }).click();
  await page.locator('#f-characters-list-0-nickname').fill('Bu Sari');
  await page.locator('#f-characters-list-0-role').fill('Pemilik warung');
  await page.locator('#f-characters-list-0-genderPresentation').fill('Perempuan');
  await page.locator('#f-characters-list-0-approxAge').fill('38');
  await page.locator('#f-characters-list-0-clothing').fill('Batik biru');
  await page.getByRole('navigation', { name: 'Langkah brief' }).getByRole('button', { name: /Project/ }).click();
  await page.locator('#f-brand').selectOption({ label: 'Warungku' });
  await expect(page.getByRole('button', { name: /Buat Konsep/ })).toBeEnabled();
  await page.getByRole('button', { name: /Buat Konsep/ }).click();

  await expect(page.getByRole('heading', { name: 'Konsep', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buat konsep', exact: true }).click();
  await expect(page.getByText('Konsep 1')).toBeVisible();
  await page.getByRole('button', { name: /Approve & lanjut/ }).click();
  await expect(page.getByRole('heading', { name: 'Naskah', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buat naskah & storyboard', exact: true }).click();
  await expect(page.getByText(/Naskah dan 4 scene dibuat/)).toBeVisible();
  await page.getByRole('button', { name: /Approve & buka Storyboard/ }).click();
  await expect(page.getByText('Total 30 / 30 detik')).toBeVisible();
  await page.getByRole('button', { name: /Lanjut ke Prompt/ }).click();
  await expect(page.getByRole('heading', { name: 'Prompt Google Flow' })).toBeVisible();
  await page.getByRole('button', { name: 'Buat prompt', exact: true }).click();
  await expect(page.getByText(/Prompt Flow dan panduan CapCut dibuat/)).toBeVisible();

  await page.getByRole('link', { name: /Export/ }).click();
  await expect(page.getByText('## Prompt Google Flow')).toBeVisible();
  expect(await page.content()).not.toContain(FAKE_KEY);
});
