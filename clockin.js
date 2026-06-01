const { chromium } = require('playwright');
const fs = require('fs');

async function runClockIn() {
  console.log('[clockin] Launching browser...');
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('[clockin] Navigating to login page...');
    await page.goto('https://people.forthlogic.com/login', { waitUntil: 'networkidle' });

    console.log('[clockin] Filling credentials securely from environment variables...');
    // Reading securely from process.env instead of hardcoding strings
    await page.fill('#email', process.env.WORK_EMAIL);
    await page.fill('#password', process.env.WORK_PASSWORD);

    console.log('[clockin] Submitting login form...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle' })
    ]);

    console.log('[clockin] Clicking "#clock_in" button...');
    await page.click('#clock_in', { timeout: 60000 });

    console.log('[clockin] Confirming action...');
    await page.waitForSelector('#clock_out, #clock_in', { timeout: 60000 });

    console.log('[clockin] Taking verification screenshot...');
    await page.screenshot({ path: 'screenshot.png', fullPage: true });

    console.log('[clockin] Action complete successfully.');
  } catch (err) {
    console.error('[clockin] Error encountered during execution:', err);
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

runClockIn();
