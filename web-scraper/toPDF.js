import puppeteer from "puppeteer";
import fs from "fs";

// JSON dosyasını oku
const jsonData = JSON.parse(fs.readFileSync('solutions2.json', 'utf8'));

// HTML şablonunu oluştur
const generateHTML = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JSON'dan PDF</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
    }
    th {
      background-color: #f2f2f2;
    }
  </style>
</head>
<body>
  <h1>JSON'dan PDF</h1>
  <table>
    <thead>
      <tr>
        ${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(item => `
        <tr>
          ${Object.values(item).map(value => `<td>${value}</td>`).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
`;

// PDF oluşturma
const createPDF = async (htmlContent, outputFile) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
  await page.pdf({ path: outputFile, format: 'A4' });

  await browser.close();
  console.log(`PDF başarıyla oluşturuldu: ${outputFile}`);
};

// HTML'yi PDF'ye dönüştür
const htmlContent = generateHTML(jsonData);
createPDF(htmlContent, 'output.pdf');
