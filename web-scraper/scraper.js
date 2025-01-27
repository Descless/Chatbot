import puppeteer from "puppeteer";
import fs from "fs";
(async () => {
  const browser = await puppeteer.launch({
    headless: true, 
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
  });

  const page = await browser.newPage();

  try {

    await page.goto('https://www.asirdx.com/tr-TR/cozumler/2/0', );

    const solutions = await page.evaluate(() => {
      const sectionElements = Array.from(document.querySelectorAll('.cozum-box-sec'));
      return sectionElements.map((element) => {
        const title = element.querySelector('.cozum-txt-tt')?.innerText || 'Başlık bulunamadı';
        const description = element.querySelector('.cozum-txt')?.innerText || 'Açıklama bulunamadı';
        const href = "https://www.asirdx.com" + element.getAttribute('href') || 'Bağlantı bulunamadı';

        return { title, description, href }; 
      });
    });

    fs.writeFileSync('solutions.json', JSON.stringify(solutions, null, 2));

    console.log('Çözümler başarıyla kaydedildi.');

    await page.goto('https://www.asirdx.com/tr-TR/hizmetler/3/0');

    const services = await page.evaluate(() => {
      const sectionElements = Array.from(document.querySelectorAll('.sektor-sec'));
      return sectionElements.map((element) => {
        const title = element.querySelector('.secon-tt')?.innerText || 'Başlık bulunamadı';
        const description = element.querySelector('.secon-txt')?.innerText || 'Açıklama bulunamadı';
        const href = "https://www.asirdx.com" + element.getAttribute('href') || 'Bağlantı bulunamadı';

        return { title, description, href }; 
      });
    });

    fs.writeFileSync('services.json', JSON.stringify(services, null, 2));

    console.log('Hizmetler başarıyla kaydedildi.');


  } catch (err) {
    console.error('Bir hata oluştu:', err.message);
  } finally {
    await browser.close();
  }
})();
