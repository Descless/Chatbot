
import puppeteer from "puppeteer";
import fs from "fs";

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }, // Ensuring viewport size
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  const visitedLinks = new Set();
  const allData = [];

  const saveToFile = () => {
    // Her veri güncellemesinden sonra dosyaya yaz
    fs.writeFileSync('services2.json', JSON.stringify(allData, null, 2), 'utf-8');
    console.log("Veriler dosyaya kaydedildi.");
  };

  const scrapePage = async (url) => {
    if (visitedLinks.has(url)) return;
    visitedLinks.add(url);

    console.log(`Ziyaret ediliyor: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

      const pageData = await page.evaluate(() => {
        const content = document.querySelector('body');
        return content ? content.innerText : 'İçerik bulunamadı.';
      });

      console.log(`Veri alındı: ${url}`);
      allData.push({ url, content: pageData });
      //saveToFile(); 
      
      const links = await page.evaluate(() => {
        const pageElements = Array.from(document.querySelectorAll('.sektor-sec, .cozum-sec-ic, .right-blm'));

        return pageElements
          .map((anchor) => {
            const title = anchor.querySelector('h1') ? anchor.querySelector('h1').innerText : 'Başlık bulunamadı';
      
            const description = anchor.querySelector('.text-blm') ? anchor.querySelector('.text-blm').innerText : 'Açıklama bulunamadı';
            
            const href = anchor.getAttribute('href');

              return {
                title,
                description,
                href: "https://www.asirdx.com" + href,
              };

          })
          .filter((link) => link !== null);
      });

      console.log(links, 'linkler')
      // Accumulate all links into the data
      allData.push(...links);
      saveToFile(); 


      // Continue scraping linked pages
      for (const link of links) {
        const fullLink = new URL(link.href, 'https://www.asirdx.com').href;
        await scrapePage(fullLink);
      }

    } catch (err) {
      console.error(`Hata oluştu: ${err.message}`);
    }
  };

  try {
    await scrapePage('https://www.asirdx.com/tr-TR/hizmetler/3/0');
    // Write all collected data to a JSON file after scraping is done
    console.log('Çözümler başarıyla kaydedildi.');
  } catch (err) {
    console.error('Bir hata oluştu:', err.message);
  } finally {
    await browser.close();
  }
})();
