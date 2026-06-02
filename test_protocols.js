/**
 * Test harness — runs the actual protocol parsers against the PDF text
 * extracted using the exact same unpdf library used by the app.
 */
const fs = require('fs')
const path = require('path')

async function extractPdfText(pdfPath) {
  const { extractText } = await import('unpdf')
  const fileBuffer = fs.readFileSync(pdfPath)
  const extracted = await extractText(new Uint8Array(fileBuffer))
  let textContent = ''
  if (Array.isArray(extracted?.text)) {
    textContent = extracted.text.join('\n')
  } else if (typeof extracted?.text === 'string') {
    textContent = extracted.text
  } else if (Array.isArray(extracted)) {
    textContent = extracted.join('\n')
  } else {
    textContent = String(extracted || '')
  }
  return textContent.split('\n').map(l => l.trim())
}

async function runTests() {
  // Test Manshi B1048
  console.log('\n' + '='.repeat(80))
  console.log('TEST: Manshi Agencies B1048.PDF')
  console.log('='.repeat(80))

  try {
    const manshi = require('./src/lib/protocols/manshi.js')
    const lines = await extractPdfText('C:\\temp\\Uploads\\new\\B1048.PDF')
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
    const lines = await extractPdfText('C:\\temp\\Uploads\\new\\RATAN LEAP BILL NO525.pdf')
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
    const lines = await extractPdfText('C:\\temp\\Uploads\\new\\IvyDMS (1).pdf')
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
}

runTests();
