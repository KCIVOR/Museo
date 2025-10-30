// Generate PDF from Markdown
// Run: node generate-pdf.js

const fs = require('fs');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

async function generatePDF() {
  try {
    console.log('📄 Reading markdown file...');
    const markdown = fs.readFileSync('CACHING_DOCUMENTATION.md', 'utf-8');
    
    console.log('🔄 Converting markdown to HTML...');
    const html = marked(markdown);
    
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 60px;
    }
    h1 {
      color: #1e293b;
      border-bottom: 3px solid #06b6d4;
      padding-bottom: 10px;
      margin-top: 40px;
    }
    h2 {
      color: #334155;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-top: 30px;
    }
    h3 {
      color: #475569;
      margin-top: 20px;
    }
    h4 {
      color: #64748b;
    }
    code {
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.9em;
      color: #e11d48;
    }
    pre {
      background: #1e293b;
      color: #f1f5f9;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 0.85em;
      line-height: 1.5;
    }
    pre code {
      background: none;
      color: #f1f5f9;
      padding: 0;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 20px 0;
      font-size: 0.9em;
    }
    th {
      background: #1e293b;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 10px;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    blockquote {
      border-left: 4px solid #06b6d4;
      padding-left: 20px;
      margin-left: 0;
      color: #64748b;
      font-style: italic;
    }
    .page-break {
      page-break-after: always;
    }
    strong {
      color: #1e293b;
    }
    a {
      color: #06b6d4;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }
    li {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
    `;
    
    console.log('🚀 Launching browser...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    console.log('📝 Setting content...');
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    console.log('💾 Generating PDF...');
    await page.pdf({
      path: 'CACHING_DOCUMENTATION.pdf',
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      printBackground: true
    });
    
    await browser.close();
    
    console.log('✅ PDF generated successfully: CACHING_DOCUMENTATION.pdf');
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
  }
}

generatePDF();
