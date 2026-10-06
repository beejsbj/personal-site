import { chromium } from 'playwright';

const CHROMIUM_PATH = process.env.PRISM_CHROMIUM;

async function takeShots() {
  const browser = await chromium.launch({ executablePath: CHROMIUM_PATH });
  const context = await browser.createContext();
  const page = await context.newPage();
  
  try {
    // Navigate to the back page lens with writing book
    await page.goto('http://localhost:3000/?lens=back-page', {
      waitUntil: 'networkidle'
    });
    
    // Take desktop screenshot (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/pr-shots/bp11b-desktop-1440x900.png' });
    console.log('✓ Desktop screenshot (1440x900)');
    
    // Take mobile screenshot (390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: '/tmp/pr-shots/bp11b-mobile-390x844.png' });
    console.log('✓ Mobile screenshot (390x844)');
    
  } finally {
    await browser.close();
  }
}

takeShots().catch(console.error);
