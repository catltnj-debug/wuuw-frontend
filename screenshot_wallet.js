const { chromium } = require('./node_modules/playwright');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzY3JlZW5zaG90X3VzZXIiLCJleHAiOjE3Nzk0MDM1Njh9.ijD-Khtla6FpdSw-XNZ18CQlSc6H9C8YLe7wbr0urjA';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Inject token before ANY page script runs
  await context.addInitScript((tok) => {
    localStorage.setItem('wuuw_token', tok);
  }, TOKEN);

  const page = await context.newPage();
  await page.goto('http://localhost:3000/wallet', { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: 'wallet_screenshot.png', fullPage: true });
  console.log('done');
  await browser.close();
})();
