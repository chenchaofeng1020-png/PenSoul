const axios = require('axios');
const cheerio = require('cheerio');

async function testZhihu() {
  try {
    console.log('Fetching Zhihu...');
    // Try adding Referer and Upgrade-Insecure-Requests
    const { data } = await axios.get('https://www.zhihu.com/billboard', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.zhihu.com/',
        'Upgrade-Insecure-Requests': '1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      }
    });
    const $ = cheerio.load(data);
    const items = $('.HotList-item');
    console.log(`Zhihu items found: ${items.length}`);
  } catch (e) {
    console.error('Zhihu error:', e.message, e.response?.status);
  }
}

async function test36Kr() {
  try {
    console.log('Fetching 36Kr...');
    const { data } = await axios.get('https://36kr.com/hot-list/catalog', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });
    const $ = cheerio.load(data);
    const items = $('.article-wrapper');
    console.log(`36Kr items found: ${items.length}`);
    if (items.length > 0) {
        const first = $(items[0]);
        console.log('36Kr First Title:', first.find('.article-item-title').text().trim());
        console.log('36Kr First Summary:', first.find('.article-item-description').text().trim());
    }
  } catch (e) {
    console.error('36Kr error:', e.message);
  }
}

(async () => {
    await testZhihu();
    await test36Kr();
})();
