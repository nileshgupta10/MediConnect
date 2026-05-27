/**
 * Test harness — runs the actual protocol parsers against the PDF text
 * extracted the same way the app does (line-by-line from unpdf output).
 * Uses the same Python pypdf extraction as a proxy.
 */
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Extract PDF text using Python (same character-by-character structure as unpdf)
function extractPdfText(pdfPath) {
  const result = execSync(`python C:\\temp\\pdf2lines.py "${pdfPath}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })
  return JSON.parse(result.trim())
}

// Test Manshi B1048
console.log('\n' + '='.repeat(80))
console.log('TEST: Manshi Agencies B1048.PDF')
console.log('='.repeat(80))

try {
  const manshi = require('./src/lib/protocols/manshi.js')
  const lines = extractPdfText('C:\\temp\\Uploads\\new\\B1048.PDF')
  console.log(`  PDF lines extracted: ${lines.length}`)
  
  const meta = manshi.getMetadata(lines)
  console.log(`  Metadata: invoice=${meta.invoiceNo}, date=${meta.date}, party=${meta.partyCode}`)
  
  const items = manshi.mapRows(lines)
  console.log(`  Items parsed: ${items.length} (expected: 44)`)
  
  let totalNet = 0
  items.forEach((item, i) => {
    const cgst = item.cgstAmt || 0
    const sgst = item.sgstAmt || 0
    totalNet += item.netAmt || (item.taxable + cgst + sgst)
    console.log(`  [${i+1}] ${item.productName.padEnd(35)} qty=${String(item.qty).padStart(3)} rate=${String(item.rate?.toFixed(2) || '?').padStart(8)} mrp=${String(item.mrp?.toFixed(2) || '?').padStart(7)} gst=${item.gstPer}% cgst=${cgst.toFixed(2)} free=${item.freeQty||0}`)
  })
  console.log(`  TOTAL NET: ${totalNet.toFixed(2)} (PDF says: 14232.00)`)
} catch (e) {
  console.error('  ERROR:', e.message)
  console.error(e.stack)
}

// Test Manshi Leap 525
console.log('\n' + '='.repeat(80))
console.log('TEST: Manshi Leap Bill 525.PDF')
console.log('='.repeat(80))

try {
  const leap = require('./src/lib/protocols/manshiLeap.js')
  const lines = extractPdfText('C:\\temp\\Uploads\\new\\RATAN LEAP BILL NO525.pdf')
  console.log(`  PDF lines extracted: ${lines.length}`)
  
  const meta = leap.getMetadata(lines)
  console.log(`  Metadata: invoice=${meta.invoiceNo}, date=${meta.date}, party=${meta.partyCode}`)
  
  const items = leap.mapRows(lines)
  console.log(`  Items parsed: ${items.length} (expected: 28)`)
  
  let totalNet = 0
  items.forEach((item, i) => {
    totalNet += item.netAmt || 0
    const mark = (item.productName.includes('PRICKLY') || item.productName.includes('PURIFYING NEEM FACE WASH 200')) ? ' <<<' : ''
    console.log(`  [${i+1}] ${item.productName.padEnd(35)} qty=${String(item.qty).padStart(3)} rate=${String(item.rate?.toFixed(2) || '?').padStart(8)} mrp=${String(item.mrp?.toFixed(2) || '?').padStart(7)} disc%=${String(item.discountPer?.toFixed(2) || '?').padStart(6)} gst=${item.gstPer}%${mark}`)
  })
  console.log(`  TOTAL NET: ${totalNet.toFixed(2)} (PDF says: 8474.89)`)
} catch (e) {
  console.error('  ERROR:', e.message)
  console.error(e.stack)
}

// Test CG Marketing
console.log('\n' + '='.repeat(80))
console.log('TEST: CG Marketing IvyDMS.PDF')
console.log('='.repeat(80))

try {
  const cgm = require('./src/lib/protocols/cgMarketing.js')
  const lines = extractPdfText('C:\\temp\\Uploads\\new\\IvyDMS (1).pdf')
  console.log(`  PDF lines extracted: ${lines.length}`)
  
  const meta = cgm.getMetadata(lines)
  console.log(`  Metadata: invoice=${meta.invoiceNo}, date=${meta.date}, party=${meta.partyCode}`)
  
  const items = cgm.mapRows(lines)
  console.log(`  Items parsed: ${items.length} (expected: 21)`)
  
  items.forEach((item, i) => {
    const mark = item.productName.toLowerCase().includes('ws') || item.qty <= 1 && item.rate > 2000 ? ' <<<' : ''
    console.log(`  [${i+1}] ${item.productName.padEnd(35)} qty=${String(item.qty).padStart(3)} rate=${String(item.rate?.toFixed(2) || '?').padStart(8)} mrp=${String(item.mrp?.toFixed(2) || '?').padStart(7)}${mark}`)
  })
} catch (e) {
  console.error('  ERROR:', e.message)
  console.error(e.stack)
}
