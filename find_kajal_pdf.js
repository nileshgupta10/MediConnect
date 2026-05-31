const fs = require('fs');
const path = require('path');
const unpdf = require('unpdf');

async function main() {
  const dir = 'C:/Users/91997/Downloads';
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.pdf'));
  
  console.log(`Searching ${files.length} PDFs for KAJAL...`);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const buffer = fs.readFileSync(filePath);
      const extracted = await unpdf.extractText(new Uint8Array(buffer));
      let textContent = '';
      if (Array.isArray(extracted?.text)) {
        textContent = extracted.text.join('\n');
      } else if (typeof extracted?.text === 'string') {
        textContent = extracted.text;
      } else if (Array.isArray(extracted)) {
        textContent = extracted.join('\n');
      } else {
        textContent = String(extracted || '');
      }
      
      const upper = textContent.toUpperCase();
      if (upper.includes('KAJAL')) {
        console.log(`MATCH FOUND: ${file} contains KAJAL! Size: ${fs.statSync(filePath).size} bytes`);
      }
    } catch (e) {
      // Ignore
    }
  }
  console.log('Search complete.');
}

main().catch(console.error);
