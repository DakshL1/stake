const puppeteer = require('puppeteer');

// --- Configuration ---
const TARGET_URL = 'https://unlistedzone.com/unlisted-shares-price-list-india';
const TARGET_SHARE_NAME = 'NSE India'; // partial match is fine
const VIEW_MORE_TEXTS = [/view more/i, /load more/i, /show more/i];

// Function to pause execution for a specific time (in milliseconds)
// This replaces the unreliable/deprecated page.waitForTimeout()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parsePrice(raw) {
  if (!raw) return NaN;
  // remove currency symbols, non-digit except dot and comma, normalize commas
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

async function clickLoadMoreIfExists(page) {
  // find any button-like element containing expected texts
  const handle = await page.evaluateHandle((texts) => {
    const normalise = (t) => (t || '').trim();
    const els = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
    for (const el of els) {
      const txt = normalise(el.innerText || el.textContent);
      if (!txt) continue;
      for (const rx of texts) {
        if (rx.test(txt)) return el;
      }
    }
    return null;
  }, VIEW_MORE_TEXTS);

  const element = handle.asElement();
  if (!element) {
    await handle.dispose();
    return false;
  }

  try {
    // scroll into view and click
    await element.evaluate((el) => {
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
      el.click();
    });
    await handle.dispose();
    return true;
  } catch (err) {
    await handle.dispose();
    return false;
  }
}

async function scrapeSharePrice() {
  console.log(`Starting scraper -> ${TARGET_URL}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36'
    );
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Keep clicking "load more" until not found or max iterations reached
    let iterations = 0;
    const MAX_ITER = 25;
    while (iterations < MAX_ITER) {
      iterations++;
      // try to click load more
      const clicked = await clickLoadMoreIfExists(page);
      if (!clicked) break;
      // wait a bit for new rows to load
      await sleep(1200);
    }

    // Wait for table rows to be present (fallback selectors)
    await Promise.race([
      page.waitForSelector('table.dataTable tbody tr', { timeout: 4000 }).catch(() => null),
      page.waitForSelector('table tbody tr', { timeout: 4000 }).catch(() => null),
    ]);

    // Extract rows
    const results = await page.evaluate((targetName) => {
      const rows = Array.from(document.querySelectorAll('table.dataTable tbody tr, table tbody tr'));
      const out = [];
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        const name = (cells[1]?.innerText || cells[0]?.innerText || '').trim();
        const price = (cells[2]?.innerText || cells[1]?.innerText || '').trim();
        const linkEl = row.querySelector('a[href]');
        const sourceUrl = linkEl ? linkEl.href : null;
        out.push({ name, price, sourceUrl });
      }
      // try to find exact/partial match first
      const match = out.find((r) => r.name && r.name.toLowerCase().includes(targetName.toLowerCase()));
      if (match) return { found: true, item: match, all: out };
      return { found: false, item: null, all: out };
    }, TARGET_SHARE_NAME);

    if (results && results.found && results.item) {
      const priceValue = parsePrice(results.item.price);
      console.log('Found:', results.item.name);
      console.log('Price raw:', results.item.price);
      console.log('Price numeric:', priceValue);
      console.log('Source URL:', results.item.sourceUrl);
      return { success: true, name: results.item.name, price: results.item.price, priceValue, sourceUrl: results.item.sourceUrl };
    }

    // If not found, return best-effort list
    const normalizedList = results.all.map((r) => ({
      name: r.name,
      priceRaw: r.price,
      priceValue: parsePrice(r.price),
      sourceUrl: r.sourceUrl,
    }));

    // determine smallest numeric price available
    const numericEntries = normalizedList.filter((r) => Number.isFinite(r.priceValue));
    const smallest = numericEntries.length ? numericEntries.reduce((a, b) => (a.priceValue < b.priceValue ? a : b)) : null;

    if (smallest) {
      console.log('Did not find exact match. Smallest available price found:');
      console.log(smallest);
      return { success: false, message: 'No exact match', smallest, list: normalizedList };
    }

    console.log('No matching rows found and no numeric prices parsed.');
    return { success: false, message: 'No data', list: normalizedList };
  } catch (err) {
    console.error('Scrape error:', err.message || err);
    return { success: false, error: err.message || String(err) };
  } finally {
    await browser.close();
  }
}

// run when executed directly
if (require.main === module) {
  scrapeSharePrice().then((res) => {
    console.log('Result:', res);
    process.exit(0);
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { scrapeSharePrice };