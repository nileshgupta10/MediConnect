import fs from 'fs'
import path from 'path'
import https from 'https'
import normalizer from '../../lib/agents/normalizer'
import smsWriter from '../../lib/agents/smsWriter'

async function fetchWithRetry(options, postData, maxRetries = 3) {
  let attempt = 0
  while (attempt < maxRetries) {
    attempt++
    const response = await new Promise((resolve) => {
      const request = https.request(options, (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: data }))
      })
      request.on('error', e => resolve({ ok: false, status: 500, body: JSON.stringify({ error: { message: e.message } }) }))
      request.write(postData)
      request.end()
    })

    if (response.ok) return response

    // Retry on 503 (temporary high demand) or 429 (rate limit)
    if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500
      console.warn(`[Gemini API] Attempt ${attempt} failed with status ${response.status}. Retrying in ${delay.toFixed(0)}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      continue
    }
    return response
  }
}

import patwari from '../../lib/protocols/patwari'
import medica from '../../lib/protocols/medica'
import beautyCosmetics from '../../lib/protocols/beauty'
import manshi from '../../lib/protocols/manshi'
import manshiLeap from '../../lib/protocols/manshiLeap'
import navkar from '../../lib/protocols/navkar'
import navkarNestle from '../../lib/protocols/navkarNestle'
import cgMarketing from '../../lib/protocols/cgMarketing'
import abmarketing from '../../lib/protocols/abmarketing'
import medicineHouse from '../../lib/protocols/medicineHouse'
import navkarPharma from '../../lib/protocols/navkarPharma'

// Check Manshi Leap before Manshi because the Leap PDF also contains shared Manshi footer text.
const PROTOCOLS = [patwari, medica, cgMarketing, beautyCosmetics, manshiLeap, manshi, navkarNestle, navkar, navkarPharma, abmarketing, medicineHouse]
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb'
  }
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function detectProtocol(text) {
  const upper = text.toUpperCase()
  for (const protocol of PROTOCOLS) {
    // ALL patterns must match (AND), not just one (OR)
    const allMatch = protocol.identifyPatterns.every(pattern =>
      upper.includes(pattern.toUpperCase())
    )
    if (allMatch) return protocol
  }
  return null
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
    const row = {}
    headers.forEach((h, i) => { row[h] = vals[i] || '' })
    return row
  }).filter(row => Object.values(row).some(v => v))
}

async function convertViaGemini(fileBuffer, mimeType, fileName, res) {
  let apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured — cannot auto-identify distributor.' })
  apiKey = apiKey.replace(/['"]/g, '').trim()

  const base64Data = fileBuffer.toString('base64')

  const promptText = `You are a highly precise pharmaceutical invoice data extractor.
Locate the invoice's line items table and extract all items.
IMPORTANT DIRECTIVES FOR VISUAL AND COLUMN ACCURACY:
1. Distributor (Seller) Disambiguation: Identify the DISTRIBUTOR (the company SELLING the products). This is always the main company branding at the very top of the invoice.
   - ⚠️ NEVER confuse this with the Customer/Buyer (e.g. "RATAN MEDICAL" or "RATAN STORES") which is listed in the "To" / "Ship To" billing section.
2. Product Volume / Sizes: Products with different volume sizes MUST be treated as completely separate, unique products.
3. Quantity Columns: Systematically locate the "Qty" (Billed Quantity) column and the "Free" (Free/Scheme Quantity) column. Do not mix them up.
4. Discount vs GST Column Alignment: Extract discount % to "discountPer" and GST % to "gstPer". NEVER confuse them. The CD% column (Cash Discount %) MUST be extracted into the discountPer field. For this invoice CD=7.18 means discountPer=7.18.
5. Pack Size: Extract the pack size to the "pack" field.

For the metadata, extract the distributor's name, invoice number, and invoice date.
Represent the output exactly in the requested JSON structure.`

  const payload = {
    contents: [{
      parts: [
        { text: promptText },
        { inlineData: { mimeType, data: base64Data } }
      ]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          metadata: {
            type: 'OBJECT',
            properties: {
              partyCode: { type: 'STRING', description: '3-letter uppercase CARE party code. If the distributor is MEDICINE HOUSE use MDH. If A B MARKETING use ABM. If MANSHI AGENCIES use MNS. If PATWARI PHARMA use PWP. If PREM AGENCY use PPH. If C G MARKETING use CGM. If BEAUTY COSMETICS use BCS. If NAVKAR use NVK.' },
              partyName: { type: 'STRING', description: 'Distributor (Seller) Name. Do NOT use the buyer/customer name.' },
              invoiceNo: { type: 'STRING', description: 'Invoice Number' },
              date: { type: 'STRING', description: 'Invoice Date (DD/MM/YYYY or original)' }
            },
            required: ['partyCode', 'partyName', 'invoiceNo', 'date']
          },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                productName: { type: 'STRING' },
                qty: { type: 'NUMBER' },
                freeQty: { type: 'NUMBER' },
                rate: { type: 'NUMBER' },
                rawRate: { type: 'NUMBER' },
                mrp: { type: 'NUMBER' },
                pack: { type: 'STRING' },
                hsn: { type: 'STRING' },
                discountPer: { 
                  type: 'NUMBER', 
                  description: "Discount % for THIS specific line item from the CDA or CD% column. Read the value from this item's own row — do NOT apply a global discount to all rows. If this row's CDA column is blank or 0.00, return 0." 
                },
                gstPer: { type: 'NUMBER' },
                taxable: { type: 'NUMBER' },
                netAmt: { type: 'NUMBER' }
              },
              required: ['productName', 'qty', 'rate', 'mrp']
            }
          }
        },
        required: ['metadata', 'items']
      }
    }
  }

  const postData = JSON.stringify(payload)
  const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: '/v1beta/models/gemini-2.5-flash:generateContent',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
  }
  const apiResponse = await fetchWithRetry(options, postData)

  if (!apiResponse.ok) {
    return res.status(500).json({ error: `Gemini AI fallback failed: ${apiResponse.body}` })
  }

  const resJson = JSON.parse(apiResponse.body)
  const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text
  if (!responseText) return res.status(500).json({ error: 'Gemini returned empty content.' })

  const parsedData = JSON.parse(responseText)
  if (!parsedData.items || parsedData.items.length === 0) {
    return res.status(400).json({ error: 'No items were parsed from this invoice by the AI.' })
  }

  let finalPartyCode = String(parsedData.metadata.partyCode || 'GEN').padEnd(3, ' ').toUpperCase().substring(0, 3)

  const normalizedRecords = normalizer.normalize(parsedData.items, {
    partyCode: finalPartyCode,
    partyName: parsedData.metadata.partyName || 'UNKNOWN',
    invoiceNo: parsedData.metadata.invoiceNo || '000000',
    date: parsedData.metadata.date || ''
  })


  const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB7556.sms')
  const templateBuffer = fs.readFileSync(templatePath)
  const smsBuffer = smsWriter.generate(normalizedRecords, templateBuffer)
  const invNo = String(parseInt(parsedData.metadata.invoiceNo.replace(/[^0-9]/g, '')) || 0)
  const filename = `RATADEH_${finalPartyCode}CRB${invNo}.sms`

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.send(smsBuffer)
}



export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const rawBody = await getRawBody(req)
    const contentType = req.headers['content-type'] || ''

    let fileBuffer = null
    let fileName = ''
    let isPDF = false

    // Parse multipart form data
    if (contentType.includes('multipart/form-data')) {
      const boundary = contentType.split('boundary=')[1]
      if (!boundary) return res.status(400).json({ error: 'No boundary in multipart' })

      const bodyStr = rawBody.toString('binary')
      const parts = bodyStr.split('--' + boundary)

      for (const part of parts) {
        if (part.includes('filename=')) {
          const nameMatch = part.match(/filename="([^"]+)"/)
          if (nameMatch) fileName = nameMatch[1]
          isPDF = fileName.toLowerCase().endsWith('.pdf')
          const dataStart = part.indexOf('\r\n\r\n') + 4
          const dataEnd = part.lastIndexOf('\r\n')
          fileBuffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary')
          break
        }
      }
    } else {
      // JSON body with csvText
      const body = JSON.parse(rawBody.toString())
      if (body.csvText) {
        const text = body.csvText
        const protocol = detectProtocol(text)
        if (!protocol) return res.status(400).json({ error: 'Could not identify distributor.' })
        const rows = parseCSV(text)
        if (rows.length === 0) return res.status(400).json({ error: 'No data rows found.' })
        return await generateSMS(protocol, rows, res)
      }
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file received.' })



    let textContent = ''

    if (isPDF) {
      const { extractText } = await import('unpdf')
      const extracted = await extractText(new Uint8Array(fileBuffer))
      if (Array.isArray(extracted?.text)) {
        textContent = extracted.text.join('\n')
      } else if (typeof extracted?.text === 'string') {
        textContent = extracted.text
      } else if (Array.isArray(extracted)) {
        textContent = extracted.join('\n')
      } else {
        textContent = String(extracted || '')
      }
    } else {
      textContent = fileBuffer.toString('utf-8')
    }

    const protocol = detectProtocol(textContent)

    // ── AUTO-FALLBACK: If no protocol matched (e.g. image-based PDF logo), use Gemini AI ──
    if (!protocol) {
      console.log('[convert-bill] Protocol not identified — auto-routing to Gemini AI fallback')
      let mimeType = 'image/jpeg'
      const lowerName = fileName.toLowerCase()
      if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf'
      else if (lowerName.endsWith('.png')) mimeType = 'image/png'
      else if (lowerName.endsWith('.webp')) mimeType = 'image/webp'
      return await convertViaGemini(fileBuffer, mimeType, fileName, res)
    }

    // For PDFs — pass raw text to protocol
    // For CSVs — parse into rows
    let rows
    if (isPDF) {
      // NOTE: Do NOT filter out blank lines here!
      // Manshi and ManshiLeap parsers use blank lines as field separators.
      // Only trim each line — keep empty lines as empty strings.
      const lines = textContent.split('\n').map(l => l.trim())
      if (protocol.mapPDF) {
        rows = protocol.mapPDF(lines)
      } else if (protocol.mapRows) {
        rows = protocol.mapRows(lines)
      } else {
        return res.status(400).json({ error: protocol.name + ' does not support PDF.' })
      }

      // For PDF protocols, getMetadata also receives lines
      const metadata = protocol.getMetadata(lines)
      const items = rows
      let finalPartyCode = String(metadata.partyCode || 'GEN').toUpperCase().substring(0, 3)
      const records = normalizer.normalize(items, { ...metadata, partyCode: finalPartyCode })
      const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB7556.sms')
      const templateBuffer = fs.readFileSync(templatePath)
      const smsBuffer = smsWriter.generate(records, templateBuffer)
      const rawInvNo = String(metadata.invoiceNo || '0').replace(/[^0-9]/g, '')
      const invNo = rawInvNo ? rawInvNo.slice(-6) : '000000'
      const filename = `RATADEH_${finalPartyCode}CRB${invNo}.sms`

      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return res.send(smsBuffer)
    } else {
      // If the protocol declares mapRawCSV, the file uses a non-standard format
      // (e.g. Navkar's H/T rows) that standard parseCSV() cannot handle correctly.
      // Pass the raw text directly to the protocol and skip parseCSV entirely.
      if (protocol.mapRawCSV) {
        const metadata = protocol.getMetadata(textContent)
        const items = protocol.mapRawCSV(textContent)
        if (!items || items.length === 0) {
          return res.status(400).json({ error: 'No data rows found in file.' })
        }
        let finalPartyCode = String(metadata.partyCode || 'GEN').padEnd(3, ' ').toUpperCase().substring(0, 3)
        const records = normalizer.normalize(items, { ...metadata, partyCode: finalPartyCode })
        const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB7556.sms')
        const templateBuffer = fs.readFileSync(templatePath)
        const smsBuffer = smsWriter.generate(records, templateBuffer)
        const rawInvNo = String(metadata.invoiceNo || '0').replace(/[^0-9]/g, '')
        const invNo = rawInvNo ? rawInvNo.slice(-6) : '000000'
        const filename = `RATADEH_${finalPartyCode}CRB${invNo}.sms`
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
        return res.send(smsBuffer)
      }
 
      rows = parseCSV(textContent)
    }
 
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'No data rows found in file.' })
 
    return await generateSMS(protocol, rows, res)

  } catch (err) {
    console.error('convert-bill error:', err)
    res.status(500).json({ error: err.message })
  }
}

async function generateSMS(protocol, rows, res) {
  const metadata = protocol.getMetadata(rows)
  const items = protocol.mapRows(rows)
  let finalPartyCode = String(metadata.partyCode || 'GEN').padEnd(3, ' ').toUpperCase().substring(0, 3)
  const records = normalizer.normalize(items, { ...metadata, partyCode: finalPartyCode })


  const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB7556.sms')
  const templateBuffer = fs.readFileSync(templatePath)

  const smsBuffer = smsWriter.generate(records, templateBuffer)

  const invNo = String(parseInt(metadata.invoiceNo.replace(/[^0-9]/g, '')) || 0)
  const filename = `RATADEH_${finalPartyCode}CRB${invNo}.sms`

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(smsBuffer)
}
