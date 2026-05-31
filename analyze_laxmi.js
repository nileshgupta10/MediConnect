const fs = require('fs');

const FIELDS = [
  ['PARTYCODE', 'C',  3, 0],
  ['NAME',      'C', 40, 0],
  ['ADD1',      'C', 40, 0],
  ['VOU_NO',    'N',  6, 0],
  ['VOU_TYPE',  'C',  3, 0],
  ['TR_DATE',   'D',  8, 0],
  ['DUE_DATE',  'D',  8, 0],
  ['PROD_CODE', 'C', 10, 0],
  ['PROD_NAME', 'C', 30, 0],
  ['COMP_NAME', 'C', 30, 0],
  ['PAK',       'C',  6, 0],
  ['UOM',       'N',  5, 0],
  ['COMP',      'C',  3, 0],
  ['QTY',       'N',  7, 0],
  ['QTY_SCM',   'N',  7, 0],
  ['DISC_SCM',  'N',  6, 2],
  ['PR_BATCHNO','C', 15, 0],
  ['EXPIRY',    'C',  5, 0],
  ['RATE',      'N', 12, 3],
  ['MRP',       'N', 12, 2],
  ['DISCOUNT',  'N',  6, 2],
  ['DISC_AMT',  'N', 12, 2],
  ['PR_PTR',    'N', 11, 3],
  ['SPL_DISC',  'N',  8, 2],
  ['SURCHARGE', 'N',  8, 2],
  ['DISC_PER',  'N',  6, 2],
  ['CASH_DISC', 'N',  8, 2],
  ['CR_AMT',    'N', 10, 2],
  ['PTS_PER',   'N',  5, 2],
  ['PTS_AMT',   'N', 10, 2],
  ['DEBIT',     'N', 12, 2],
  ['GROS_AMT',  'N', 12, 2],
  ['CAT_CODE',  'C',  3, 0],
  ['FREIGHT',   'N', 10, 2],
  ['BAR_CODE',  'C', 50, 0],
  ['HSNCODE',   'C', 15, 0],
  ['SGST',      'N',  5, 2],
  ['CGST',      'N',  5, 2],
  ['IGST',      'N',  5, 2],
  ['SGSTAMT',   'N', 10, 3],
  ['CGSTAMT',   'N', 10, 3],
  ['IGSTAMT',   'N', 10, 3],
  ['SHELF_NO',  'C', 10, 0],
  ['_NullFlags','0',  1, 0]
];

const path = 'C:/Users/91997/Downloads/RATADEH_LAXCRB21493.sms';
if (!fs.existsSync(path)) {
  console.log('Laxmi file does not exist at:', path);
  process.exit(1);
}

const f = fs.readFileSync(path);
const HEADER = 1704;
const RECORD_SIZE = 499;

const numRecords = f.readUInt32LE(4);
console.log('========================================================');
console.log('        FORENSIC ANALYSIS: RATADEH_LAXCRB21493.sms');
console.log('========================================================');
console.log('File size:', f.length, 'bytes');
console.log('Header specified records:', numRecords);
console.log('Calculated records:', (f.length - HEADER - 1) / RECORD_SIZE);
console.log('dBASE version byte:', f[0].toString(16));
console.log('Header update date (YY-MM-DD):', f[1] + '-' + f[2] + '-' + f[3]);

// Print record fields with hex details
const start = HEADER;
console.log('\nRecord 1 details:');
console.log('Deletion Flag byte:', f[start].toString(16), `('${String.fromCharCode(f[start])}')`);

let offset = start + 1;
for (const [name, type, len, dec] of FIELDS) {
  const slice = f.slice(offset, offset + len);
  let val;
  if (type === '0') {
    val = slice.toString('hex');
  } else {
    val = slice.toString('latin1');
  }
  
  // Format info
  const hexRep = slice.toString('hex');
  console.log(`${name.padEnd(12)} | Type: ${type} | Len: ${len} | Val: [${val}] | Hex: ${hexRep}`);
  offset += len;
}

// EOF Marker
console.log('\nEOF Marker byte:', f[f.length - 1].toString(16));
