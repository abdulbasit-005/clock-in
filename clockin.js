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
  let clockinState = 'SUCCESS'; // Default state

  try {
    console.log('[clockin] Navigating to login page...');
    await page.goto('https://people.forthlogic.com/login', { waitUntil: 'networkidle' }); [cite: 74]

    console.log('[clockin] Filling credentials securely from environment variables...');
    await page.fill('#email', process.env.WORK_EMAIL);
    await page.fill('#password', process.env.WORK_PASSWORD);

    console.log('[clockin] Submitting login form...');
    await Promise.all([
      page.click('button[type="submit"]'), [cite: 76]
      page.waitForNavigation({ waitUntil: 'networkidle' }) [cite: 76]
    ]);

    console.log('[clockin] Checking "#clock_in" button state...');
    const clockInButton = page.locator('#clock_in'); [cite: 77]
    await clockInButton.waitFor({ state: 'visible', timeout: 10000 });
    
    const isDisabled = await clockInButton.isDisabled();

    if (isDisabled) {
      console.log('[clockin] ⚠️ "#clock_in" button is currently DISABLED.');
      clockinState = 'ALREADY_CLOCKED_IN'; 
    } else {
      console.log('[clockin] Button is active. Clicking "#clock_in" button...');
      await clockInButton.click({ timeout: 30000 });
      
      console.log('[clockin] Confirming action...');
      await page.waitForSelector('#clock_out, #clock_in', { timeout: 30000 }); [cite: 77]
      console.log('[clockin] Action completed successfully.');
    }

    console.log('[clockin] Taking verification screenshot...');
    await page.screenshot({ path: 'screenshot.png', fullPage: true });

    // Expose the state to GitHub Actions workflow variables
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `CLOCKIN_STATE=${clockinState}\n`);
    }

  } catch (err) {
    console.error('[clockin] Error encountered during execution:', err); [cite: 80]
    process.exit(1);
  } finally {
    await context.close(); [cite: 81]
    await browser.close(); [cite: 87]
  }
}

runClockIn();
