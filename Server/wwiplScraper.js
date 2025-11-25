// wwipl_scraper.js
// Scraper for wwipl.com
const puppeteer = require('puppeteer');
const cheerio = require('cheerio'); 

const URL = 'https://wwipl.com/';
const TARGET_TABLE_ID = '#portfoliolist'; 

async function scrapeWWIShareByName(targetName) {
    let browser;
    console.log(`\n**Starting Hybrid Scraper for wwipl.com for:** "${targetName}"\n`);

    if (!targetName || targetName.trim() === "") {
        console.error("Target share name is required.");
        return null;
    }

    try {
        browser = await puppeteer.launch({ 
            headless: 'new',
            // FIX: Added the necessary arguments for Render
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        await page.goto(URL, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });
        
        await page.waitForSelector(`${TARGET_TABLE_ID} tbody tr`, { timeout: 30000 }); 
        
        const renderedHtml = await page.content();
        
        const $ = cheerio.load(renderedHtml);
        const searchName = targetName.toLowerCase().trim();
        let foundShareData = null;

        $(`${TARGET_TABLE_ID} tbody tr`).each((index, element) => {
            const columns = $(element).find('td');
            
            if (columns.length > 6) {
                const shareNameElement = $(columns).eq(2).find('a');
                const scrapedShareName = shareNameElement.text().trim(); 
                
                if (scrapedShareName && scrapedShareName.toLowerCase().includes(searchName)) {
                    const price = $(columns).eq(6).text().trim();            

                    foundShareData = {
                        shareName: scrapedShareName,
                        lastTradedPrice: price, 
                        sourceUrl: URL
                    };
                    return false; 
                }
            }
        });

        return foundShareData;

    } catch (error) {
        console.error(`\nAn error occurred during scraping wwipl: ${error.message}`);
        return { error: 'WWI Scraper failed.', details: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = { scrapeWWIShareByName };