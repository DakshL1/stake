// puppeteer.config.cjs
const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // This tells Puppeteer to download the browser to a location
    // that Render is guaranteed to preserve between build and runtime.
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};