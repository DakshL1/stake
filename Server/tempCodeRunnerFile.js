// unlistedzone_scraper.js

const puppeteer = require('puppeteer');
const cheerio = require('cheerio'); 

// --- Configuration ---
const URL = 'https://unlistedzone.com/unlisted-shares-price-list-india';
const TARGET_CONTAINER = '.row.share-container'; // The main container holding all share cards
const TARGET_SHARE_NAME = 'A One Steel India Limited'; // <-- Set the name you want to search for

async function scrapeUnlistedZoneShare(targetName) {
    let browser;
    console.log(`\n**Starting Hybrid Scraping for URL:** ${URL}`);
    console.log(`**Searching for share (partial match):** "${targetName}"\n`);

    try {
        // --- 1. PUPPETEER: LAUNCH BROWSER AND RENDER PAGE ---
        browser = await puppeteer.launch({ 
            headless: true 
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        await page.goto(URL, { 
            waitUntil: 'networkidle0', // Wait for network to be idle
            timeout: 60000 
        });
        
        // Wait for the main container to load
        await page.waitForSelector(TARGET_CONTAINER, { timeout: 30000 });
        
        // Wait for at least one share card to be present
        await page.waitForSelector('.share', { timeout: 30000 }); 
        
        const renderedHtml = await page.content();
        console.log('**✅ Puppeteer finished rendering and fetching HTML.**\n');

        // --- 2. CHEERIO: LOAD HTML ---
        const $ = cheerio.load(renderedHtml);

        // --- 3. CHEERIO: PARSE AND SEARCH DATA ---
        const searchName = targetName.toLowerCase().trim();
        let foundShareData = null;

        // **Accurate Selector:** Target the repeating element based on your HTML
        const shareCards = $(`${TARGET_CONTAINER} .share`); 
        
        console.log(`Found ${shareCards.length} potential share entries to check.`);

        shareCards.each((index, element) => {
            // Find the h5 containing the share name link
            const shareNameElement = $(element).find('.card-body h5.card-title a');
            const scrapedShareName = shareNameElement.text().trim();
            
            // Compare (case-insensitive partial match)
            if (scrapedShareName && scrapedShareName.toLowerCase().includes(searchName)) {
                
                // 1. Get the Share Price (It is the second h5.card-title within the card-body)
                const priceElement = $(element).find('.card-body h5.card-title').eq(1); // eq(1) targets the second h5
                const price = priceElement.text().trim(); 

                // 2. Get the Price Change and Percentage Change
                const changeElement = $(element).find('.change-in-price');
                const changeText = changeElement.text().trim();

                foundShareData = {
                    shareName: scrapedShareName, 
                    lastTradedPrice: price, 
                    priceChange: changeText,
                };
                
                // Stop iterating once the first match is found
                return false; 
            }
        });

        // --- 4. Output the result ---
        if (foundShareData) {
            console.log(`**✅ SUCCESS: Found structured data for share matching "${targetName}"**`);
            console.log(foundShareData);
            console.log("\n**--- End of Scraped Data ---**");
        } else {
            console.error(`**❌ NOT FOUND:** Could not find any share matching "${targetName}" in the list.`);
        }

    } catch (error) {
        console.error(`**An error occurred during execution:** ${error.message}`);
    } finally {
        // --- 5. Close the browser instance ---
        if (browser) {
            await browser.close();
            console.log("\n**Browser closed.**");
        }
    }
}

// Execute the main function
scrapeUnlistedZoneShare(TARGET_SHARE_NAME);