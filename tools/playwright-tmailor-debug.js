const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const OUTPUT_DIR = path.join(process.cwd(), 'playwright-debug-artifacts', 'tmailor');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

async function exists(page, selector) {
  try {
    return await page.locator(selector).first().isVisible({ timeout: 800 });
  } catch {
    return false;
  }
}

async function textContent(page, selector) {
  try {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'attached', timeout: 500 });
    return (await locator.textContent()) || '';
  } catch {
    return '';
  }
}

async function attr(page, selector, name) {
  try {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'attached', timeout: 500 });
    return await locator.getAttribute(name);
  } catch {
    return null;
  }
}

async function evaluateState(page) {
  return await page.evaluate(() => {
    const q = (selector) => document.querySelector(selector);
    const visible = (el) => {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const currentEmailInput = q('input[name="currentEmailAddress"]');
    const currentEmail = currentEmailInput ? String(currentEmailInput.value || '').trim() : '';
    const monetizationDialog = q('.fc-monetization-dialog.fc-dialog');
    const playButton = q('.fc-monetization-dialog.fc-dialog .fc-list-container button');
    const interstitial = q('#ad_position_box');
    const dismiss = q('#dismiss-button-element, #dismiss-button-element > div');
    const turnstile = q('.cf-turnstile, .html-captcha, iframe[src*="challenges.cloudflare.com"], input[name="cf-turnstile-response"], input[id*="cf-chl-widget"][id$="_response"]');
    const turnstileIframe = q('iframe[src*="challenges.cloudflare.com"]');
    const responseInput = q('input[name="cf-turnstile-response"], input[id*="cf-chl-widget"][id$="_response"]');
    const confirm = q('#btnNewEmailForm');
    const newEmail = q('#btnNewEmail');
    const refresh = q('#refresh-inboxs');

    return {
      url: location.href,
      title: document.title,
      currentEmail,
      currentEmailDisabled: Boolean(currentEmailInput?.disabled),
      currentEmailTitle: currentEmailInput?.getAttribute('title') || '',
      currentEmailPlaceholder: currentEmailInput?.getAttribute('placeholder') || '',
      monetizationVisible: visible(monetizationDialog),
      playVisible: visible(playButton),
      playText: playButton?.textContent?.trim() || '',
      interstitialVisible: visible(interstitial),
      dismissVisible: visible(dismiss),
      turnstileVisible: visible(turnstile),
      turnstileIframeVisible: visible(turnstileIframe),
      turnstileResponsePresent: Boolean(responseInput),
      turnstileResponseLength: String(responseInput?.value || '').trim().length,
      confirmVisible: visible(confirm),
      confirmDisabled: Boolean(confirm?.disabled || confirm?.getAttribute('aria-disabled') === 'true'),
      confirmText: confirm?.textContent?.trim() || '',
      newEmailVisible: visible(newEmail),
      refreshVisible: visible(refresh),
      bodyTextSnippet: (document.body?.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300),
    };
  });
}

function buildTurnstileClickPoint(box) {
  if (!box) {
    return null;
  }

  const offsetX = Math.max(26, Math.min(box.width * 0.12, 36));
  return {
    x: box.x + offsetX,
    y: box.y + (box.height / 2),
  };
}

async function humanClickPoint(page, point) {
  if (!point) {
    return;
  }

  await page.mouse.move(point.x - 18, point.y - 6, { steps: 8 });
  await page.mouse.move(point.x, point.y, { steps: 6 });
  await page.mouse.down();
  await page.waitForTimeout(80);
  await page.mouse.up();
}

async function clickTurnstileCheckboxArea(page) {
  const iframeLocator = page.locator('iframe[src*="challenges.cloudflare.com"]').first();
  try {
    if (await iframeLocator.isVisible({ timeout: 1200 })) {
      const box = await iframeLocator.boundingBox();
      const point = buildTurnstileClickPoint(box);
      if (point) {
        console.log(`[pw:tmailor] Turnstile iframe detected, clicking left checkbox area at ${Math.round(point.x)},${Math.round(point.y)}`);
        await humanClickPoint(page, point);
        return 'turnstile_iframe_point_clicked';
      }
    }
  } catch {}

  const containerLocator = page.locator('.cf-turnstile, .html-captcha').first();
  try {
    if (await containerLocator.isVisible({ timeout: 1200 })) {
      const box = await containerLocator.boundingBox();
      const point = buildTurnstileClickPoint(box);
      if (point) {
        console.log(`[pw:tmailor] Turnstile container detected, clicking left checkbox area at ${Math.round(point.x)},${Math.round(point.y)}`);
        await humanClickPoint(page, point);
        return 'turnstile_container_point_clicked';
      }
    }
  } catch {}

  return 'no_turnstile_target';
}

async function tryHandlePopup(page) {
  if (await exists(page, '.fc-monetization-dialog.fc-dialog .fc-list-container button')) {
    console.log('[pw:tmailor] Monetization dialog detected, clicking play');
    await page.locator('.fc-monetization-dialog.fc-dialog .fc-list-container button').first().click({ force: true, timeout: 5000 });
    return 'monetization_play_clicked';
  }

  if (await exists(page, '#dismiss-button-element > div')) {
    console.log('[pw:tmailor] Dismiss button detected, clicking close');
    await page.locator('#dismiss-button-element > div').first().click({ force: true, timeout: 5000 });
    return 'dismiss_clicked';
  }

  if (await exists(page, '#dismiss-button-element')) {
    console.log('[pw:tmailor] Dismiss root detected, clicking close');
    await page.locator('#dismiss-button-element').first().click({ force: true, timeout: 5000 });
    return 'dismiss_root_clicked';
  }

  if (await exists(page, '#btnNewEmailForm:not([disabled])')) {
    console.log('[pw:tmailor] Confirm button detected and enabled, clicking confirm');
    await page.locator('#btnNewEmailForm').first().click({ force: true, timeout: 5000 });
    return 'confirm_clicked';
  }

  const turnstileAction = await clickTurnstileCheckboxArea(page);
  if (turnstileAction !== 'no_turnstile_target') {
    return turnstileAction;
  }

  return 'no_action';
}

async function snapshot(page, label) {
  ensureDir(OUTPUT_DIR);
  const safe = label.replace(/[^\w.-]+/g, '_');
  await page.screenshot({ path: path.join(OUTPUT_DIR, `${safe}.png`), fullPage: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, `${safe}.html`), await page.content(), 'utf8');
}

async function main() {
  ensureDir(OUTPUT_DIR);
  const browser = await chromium.launch({
    headless: false,
    executablePath: CHROME_PATH,
    args: ['--disable-blink-features=AutomationControlled'],
    slowMo: 250,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  page.on('console', (msg) => {
    console.log(`[page:${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => {
    console.log(`[pageerror] ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    console.log(`[requestfailed] ${req.method()} ${req.url()} :: ${req.failure()?.errorText || 'unknown'}`);
  });

  await page.goto('https://tmailor.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  for (let cycle = 1; cycle <= 8; cycle += 1) {
    console.log(`\n=== TMAILOR CYCLE ${cycle} ===`);
    const before = await evaluateState(page);
    console.log('[state:before]', JSON.stringify(before, null, 2));
    await snapshot(page, `cycle-${cycle}-before`);

    let action = 'no_action';
    if (before.newEmailVisible && !before.turnstileVisible && !before.turnstileIframeVisible && !before.confirmVisible) {
      console.log('[pw:tmailor] Clicking New Email to trigger mailbox generation flow');
      await page.locator('#btnNewEmail').first().click({ force: true, timeout: 5000 });
      action = 'new_email_clicked';
      await page.waitForTimeout(3500);
    }

    if (action === 'no_action') {
      action = await tryHandlePopup(page);
    }

    if (action !== 'no_action') {
      await page.waitForTimeout(5000);
    } else if (cycle < 8) {
      console.log('[pw:tmailor] No popup action taken, refreshing page');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(5000);
    }

    const after = await evaluateState(page);
    console.log('[state:after]', JSON.stringify(after, null, 2));
    await snapshot(page, `cycle-${cycle}-after`);
  }

  console.log(`[pw:tmailor] Artifacts saved to ${OUTPUT_DIR}`);
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch((error) => {
  console.error('[pw:tmailor] Fatal error:', error);
  process.exitCode = 1;
});
