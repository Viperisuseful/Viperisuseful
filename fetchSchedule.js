const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

async function fetchSchedule() {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Navigate to the initial page
        const baseUrl = 'https://emploi-fssm.uca.ma/convocation/S1/';
        await page.goto(baseUrl);

        // Enter the CNE value
        await page.type('input[name="CNE"]', 'G138074501');

        // Click the submit button
        await Promise.all([
            page.click('input[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0' })
        ]);

        // Get the content of the redirected page
        const content = await page.content();

        // Load the content into cheerio for parsing
        const $ = cheerio.load(content);

        // Create a directory for resources if it doesn't exist
        const resourcesDir = path.join(__dirname, 'resources');
        if (!fs.existsSync(resourcesDir)) {
            fs.mkdirSync(resourcesDir);
        }

        // Function to sanitize filenames
        function sanitizeFilename(filename) {
            return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        }

        // Download and replace image sources
        const downloadPromises = [];
        $('img').each((index, element) => {
            let imgUrl = $(element).attr('src');
            if (imgUrl) {
                // Resolve relative URLs
                imgUrl = url.resolve(baseUrl, imgUrl);
                const imgName = sanitizeFilename(path.basename(imgUrl));
                const imgPath = path.join(resourcesDir, imgName);
                const localImgPath = `/resources/${imgName}`;
                $(element).attr('src', localImgPath);

                const downloadPromise = axios({
                    method: 'get',
                    url: imgUrl,
                    responseType: 'stream'
                }).then(response => {
                    response.data.pipe(fs.createWriteStream(imgPath));
                }).catch(error => {
                    console.error('Error downloading image:', imgUrl, error);
                });

                downloadPromises.push(downloadPromise);
            }
        });

        // Wait for all downloads to complete
        await Promise.all(downloadPromises);

        // Add download button and script to the HTML
        const downloadButtonHtml = `
            <button id="downloadBtn">Download as PDF</button>
            <script>
                document.getElementById('downloadBtn').addEventListener('click', function() {
                    window.print();
                });
            </script>
        `;
        $('body').prepend(downloadButtonHtml);

        // Save the modified HTML content to an HTML file
        fs.writeFileSync('schedule.html', $.html());

        await browser.close();
    } catch (error) {
        console.error('Error fetching schedule:', error);
        throw error;
    }
}

module.exports = fetchSchedule;