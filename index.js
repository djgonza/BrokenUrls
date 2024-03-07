const https = require('https');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const axios = require('axios').create({ httpsAgent });
const cheerio = require('cheerio');
const url = require('url');

async function findBrokenLinks(baseUrl, currentUrl, visitedUrls = new Set(), brokenLinks = []) {
    if (visitedUrls.has(currentUrl)) return; // evitar bucles infinitos
    visitedUrls.add(currentUrl);

    try {
        const response = await axios.get(currentUrl);
        //console.log('Analizando', currentUrl, '...');
        const $ = cheerio.load(response.data);

        $('a').each(function () {
            const link = $(this).attr('href');
            if (link) {
                const absoluteLink = url.resolve(currentUrl, link);
                if (!absoluteLink.startsWith(baseUrl)) return; // ignorar enlaces externos
                if (!visitedUrls.has(absoluteLink)) {
                    findBrokenLinks(baseUrl, absoluteLink, visitedUrls, brokenLinks);
                }
            }
        });
    } catch (error) {
        console.log('Error al analizar', currentUrl, error.response ? error.response.status : error.code);
        brokenLinks.push({ url: currentUrl, status: error.response ? error.response.status : 'Unknown' });
    }

    return { brokenLinks, visitedUrls };
}

async function main() {
    // Obtener la URL como parámetro
    const args = process.argv.slice(2);
    const baseUrlArg = args.find(arg => arg.startsWith('--url='));
    if (!baseUrlArg) {
        console.error('Por favor, proporcione una URL usando el parámetro --url.');
        return;
    }

    const baseUrl = baseUrlArg.split('=')[1];
    const { brokenLinks, visitedUrls } = await findBrokenLinks(baseUrl, baseUrl);

    console.log('Enlaces visitados:', visitedUrls);
    console.log('Enlaces rotos encontrados:');
    brokenLinks.forEach(link => console.log(link.url, '- Estado:', link.status));
}

main();
