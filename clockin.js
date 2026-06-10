const { chromium } = require('playwright');
const fs = require('fs');

async function runClockIn() {
  console.log('[clockin] Launching stealth browser...');
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      // Spoof a legitimate desktop Chrome user agent at the browser level
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    ]
  });

  // Emulate a standard Windows 10 desktop environment
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Karachi'
  });
  
  const page = await context.newPage();
  let clockinState = 'SUCCESS';

  try {
    console.log('[clockin] Navigating to login page...');
    
    // Crucial Change: We use 'domcontentloaded' so we don't get stuck on slow background scripts
    await page.goto('https://people.forthlogic.com/login', { 
      waitUntil: 'domcontentloaded', 
      timeout: 45000 
    });

    // Instead of waiting for the whole page load event, we just wait for the input to appear
    console.log('[clockin] Waiting for email input field to appear...');
    await page.waitForSelector('#email', { timeout: 20000 });

    console.log('[clockin] Filling credentials securely...');
    await page.fill('#email', process.env.WORK_EMAIL);
    await page.fill('#password', process.env.WORK_PASSWORD);

    console.log('[clockin] Submitting login form...');
    // Type submit can cause a navigation, we wait for it to transition
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => console.log('Navigation transition slow, proceeding...'))
    ]);

    console.log('[clockin] Checking "#clock_in" button state...');
    const clockInButton = page.locator('#clock_in');
    await clockInButton.waitFor({ state: 'visible', timeout: 20000 });
    
    const isDisabled = await clockInButton.isDisabled();

    if (isDisabled) {
      console.log('[clockin] ⚠️ "#clock_in" button is currently DISABLED.');
      clockinState = 'ALREADY_CLOCKED_IN'; 
    } else {
      console.log('[clockin] Button is active. Clicking "#clock_in" button...');
      await clockInButton.click({ timeout: 20000 });
      
      console.log('[clockin] Confirming action...');
      await page.waitForSelector('#clock_out, #clock_in', { timeout: 20000 });
      console.log('[clockin] Action completed successfully.');
    }

    console.log('[clockin] Taking verification screenshot...');
    await page.screenshot({ path: 'screenshot.png', fullPage: true });

    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `CLOCKIN_STATE=${clockinState}\n`);
    }

  } catch (err) {
    console.error('[clockin] Error encountered during execution:', err);
    
    // Fallback: capture whatever is on the screen right now (even an error page) 
    // so it still attaches to your failure notification email!
    try {
      await page.screenshot({ path: 'screenshot.png', fullPage: true });
      console.log('[clockin] Saved emergency error screenshot.');
    } catch (e) {
      console.error('[clockin] Could not capture error screenshot:', e);
    }
    
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

runClockIn();
