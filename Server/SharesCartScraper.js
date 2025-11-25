// scraper.js
// Scraper for sharescart.com

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const URL = 'https://www.sharescart.com/unlisted-shares/unlisted-shares-quotes.php';

async function scrapeSharePrice(targetName) {
    let browser;
    console.log(`\n🔍 Starting scraping for sharescart.com → "${targetName}"`);

    if (!targetName || targetName.trim() === "") {
        console.error("❌ Target share name required.");
        return null;
    }

    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
        );

        await page.goto(URL, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        await page.waitForSelector('.row.m-0.w-100', { timeout: 30000 });

        const html = await page.content();
        const $ = cheerio.load(html);

        const searchName = targetName.toLowerCase().trim();
        let foundShareData = null;

        // LOOP THROUGH EACH ROW
        $('.row.m-0.w-100').each((i, element) => {

            // Extract the company name ONLY from this row
            const name = $(element)
                .find('a.companyPDFName')
                .first()
                .text()
                .trim();

            if (!name) return; // skip empty rows

            // Match user input
            if (!name.toLowerCase().includes(searchName)) return;

            // Extract price (the 2nd .col-sm-2 column's span)
            const priceRaw = $(element)
                .find('.col-sm-2.vh-align span.ng-binding')
                .eq(1)
                .text()
                .trim();

            const cleanPrice = priceRaw.replace(/[^\d.]/g, "");

            foundShareData = {
                shareName: name,
                lastTradedPrice: cleanPrice,
                sourceUrl: URL
            };

            return false; // stop loop once found
        });

        return foundShareData;

    } catch (error) {
        console.error(`❌ SharesCart Scraper Error: ${error.message}`);
        return { error: 'SharesCart Scraper failed.', details: error.message };
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = { scrapeSharePrice };
