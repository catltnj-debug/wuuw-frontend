import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 900 });

// 1. Homepage
await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'C:/Users/Ghost X/wuuw/web/sc_home.png' });
console.log('✓ homepage');

// 2. Wallet - Buy Credits tab
await page.goto('http://localhost:3000/wallet', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(1500);
try {
  const buyBtn = page.getByRole('button', { name: /Buy Credits|购买/i });
  await buyBtn.first().click();
  await page.waitForTimeout(600);
} catch(e) { console.log('tab click:', e.message); }
await page.screenshot({ path: 'C:/Users/Ghost X/wuuw/web/sc_wallet.png' });
console.log('✓ wallet');

// 3. Asset detail (first asset)
const r = await fetch('http://localhost:8001/api/assets').then(x => x.json()).catch(() => ({ items: [] }));
const id = r.items?.[0]?.id;
if (id) {
  await page.goto(`http://localhost:3000/assets/${id}`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/Ghost X/wuuw/web/sc_asset.png', fullPage: true });
  console.log('✓ asset', id);
} else {
  console.log('no assets found');
}

await browser.close();
