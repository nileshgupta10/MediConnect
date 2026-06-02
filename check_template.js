const fs = require('fs');

const path = 'C:/Project1/MediConnect/MediConnect/public/templates/RATADEH_MMPCRB7556.sms';
if (!fs.existsSync(path)) {
  console.log('Template does not exist at:', path);
  process.exit(1);
}

const f = fs.readFileSync(path);
console.log('Template size:', f.length);
console.log('Template records in header:', f.readUInt32LE(4));
console.log('Template header size:', f.readUInt16LE(8));
console.log('Template record size:', f.readUInt16LE(10));
