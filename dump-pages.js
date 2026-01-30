// dump-pages.js
// Dumps full contents of important project files to console

const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  'src/pages',
  'src/components',
  'src/lib'
];

function dumpDir(dir) {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      dumpDir(fullPath);
    } else if (item.isFile() && item.name.endsWith('.js')) {
      console.log('\n\n==============================');
      console.log('FILE:', fullPath);
      console.log('==============================\n');
      console.log(fs.readFileSync(fullPath, 'utf8'));
    }
  }
}

TARGET_DIRS.forEach(dumpDir);
