import fs from 'fs'
import path from 'path'
import https from 'https'
import { createClient } from '@supabase/supabase-js'
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

export default async function handler(req, res) {
  return res.status(410).json({ error: 'AI Scanner has been disabled.' })
}

async function originalHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const rawBody = await getRawBody(req)
    const contentType = req.headers['content-type'] || ''

    let fileBuffer = null
    let fileName = ''
    let isPDF = false

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
    }

    if (!fileBuffer) return res.status(400).json({ error: 'No file received.' })

    const lowerName = fileName.toLowerCase()

    // Guard: AI scan only works on PDF or image files — not CSV
    if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
      return res.status(400).json({ error: 'AI Scan does not support CSV files. Please use the Protocol (⚡ Convert) button for CSV bills.' })
    }

    const base64Data = fileBuffer.toString('base64')
    
    // Determine mimeType
    let mimeType = 'image/jpeg'
    if (lowerName.endsWith('.pdf')) {
      mimeType = 'application/pdf'
    } else if (lowerName.endsWith('.png')) {
      mimeType = 'image/png'
    } else if (lowerName.endsWith('.webp')) {
      mimeType = 'image/webp'
    }

    let apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured in .env.local' })
    }
    // Clean key from quotes or trailing whitespaces
    apiKey = apiKey.replace(/['"]/g, '').trim()

    // Detect partyCode from filename or text for initial memory note fetching
    let detectedPartyCode = 'MNS'
    const upperName = fileName.toUpperCase()
    if (upperName.includes('MNS') || upperName.includes('MANSHI')) detectedPartyCode = 'MNS'
    else if (upperName.includes('PWP') || upperName.includes('PATWARI')) detectedPartyCode = 'PWP'
    else if (upperName.includes('PPH') || upperName.includes('PREM') || upperName.includes('MEDICA')) detectedPartyCode = 'PPH'
    else if (upperName.includes('BCS') || upperName.includes('BEAUTY')) detectedPartyCode = 'BCS'
    else if (upperName.includes('NVK') || upperName.includes('NAVKAR')) detectedPartyCode = 'NVK'
    else if (upperName.includes('MDH') || upperName.includes('MEDICINE')) detectedPartyCode = 'MDH'
    else if (upperName.includes('ABM') || upperName.includes('ABMARKETING')) detectedPartyCode = 'ABM'
    else if (upperName.includes('CGM') || upperName.includes('CGMARKETING')) detectedPartyCode = 'CGM'
    else if (isPDF) {
      try {
        const { extractText } = await import('unpdf')
        const extracted = await extractText(new Uint8Array(fileBuffer))
        const text = Array.isArray(extracted?.text) ? extracted.text.join('\n') : String(extracted?.text || extracted || '')
        const upper = text.toUpperCase()
        if (upper.includes('MANSHI')) detectedPartyCode = 'MNS'
        else if (upper.includes('PATWARI')) detectedPartyCode = 'PWP'
        else if (upper.includes('PREM') || upper.includes('MEDICA')) detectedPartyCode = 'PPH'
        else if (upper.includes('BEAUTY')) detectedPartyCode = 'BCS'
        else if (upper.includes('NAVKAR')) detectedPartyCode = 'NVK'
        else if (upper.includes('MEDICINE HOUSE')) detectedPartyCode = 'MDH'
        else if (upper.includes('A B MARKETING')) detectedPartyCode = 'ABM'
        else if (upper.includes('C G MARKETING')) detectedPartyCode = 'CGM'
      } catch (e) {
        console.warn('Could not extract text to detect partyCode:', e)
      }
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    let formatNotes = {}
    let memoryPartyName = ''
    if (req.query.storeOwnerId) {
      try {
        const { data: fmt } = await supabaseAdmin
          .from('distributor_formats')
          .select('format_notes, party_name')
          .eq('store_owner_id', req.query.storeOwnerId)
          .eq('party_code', detectedPartyCode)
          .maybeSingle()
        if (fmt) {
          formatNotes = fmt.format_notes || {}
          memoryPartyName = fmt.party_name || ''
        }
      } catch (e) {
        console.error('Could not query distributor_formats:', e)
      }
    }

    const memoryNote = memoryPartyName
      ? `\nPREVIOUSLY LEARNED ABOUT THIS DISTRIBUTOR (${memoryPartyName}): ${JSON.stringify(formatNotes)}. Apply these known column patterns.`
      : ''

    const promptText = `You are a highly precise pharmaceutical and FMCG invoice data extractor.

CRITICAL COLUMN READING RULES:

1. DISTRIBUTOR vs CUSTOMER: The DISTRIBUTOR is the company at the TOP of the bill (seller). NEVER use the "To" / "Billed to" / receiver section as the party name.

2. FREE QTY COLUMN (FR column):
   - The FR column contains only whole numbers like 0, 1, 2, 3.
   - If a row's FR cell is blank or empty, freeQty = 0. Do NOT default to any other value.
   - DANGER: The SCH% column (scheme percentage like 10.00, 8.00) is a DIFFERENT column from FR. Never put a SCH% value into freeQty. A value like 10.00 or 8.00 is a percentage — it is NOT a free quantity.
   - Only read freeQty from the column explicitly labelled FR or Free.

3. QTY COLUMN: Read the Qty value from THIS row only. Do not accidentally read the qty from the row above or below. Each row is independent.

4. SCHEME DISCOUNT — ONE VALUE ONLY:
   - Some invoices have TWO scheme discount columns: "SCH %" (a percentage) and "SCHM AMT" or "SCH AMT" (a rupee amount).
   - These represent the SAME discount expressed two ways. Use ONLY the rupee amount (SCHM AMT) as discountAmt. Do NOT apply the SCH% on top of SCHM AMT again — that would double-count the discount.
   - If only SCH% exists and no rupee amount column, calculate: discountAmt = qty × rate × (SCH% / 100).
   - If SCHM AMT rupee column exists, use that directly as discountAmt and set discountPer = SCH%.

5. CD% (Cash Discount): This is a separate per-row column. Read it from THIS row's own cell. If blank, CD = 0. Never apply the bill's global CD% to all rows uniformly.

6. RATE COLUMN: Every row must have a rate. If the rate cell appears blank due to image quality, estimate it from: rate = taxable / qty. Never leave rate as 0 if taxable or net amount is non-zero.

7. TAXABLE AMOUNT: taxable = (qty × rate) − discountAmt. This is the pre-GST base. Do not include free qty in taxable calculation.

8. GST: SGST% and CGST% together make total GST. Extract each half separately. If only total GST% shown, split equally (e.g. 18% GST = 9% SGST + 9% CGST).

9. NET AMOUNT: netAmt = taxable × (1 + totalGST/100). Verify your extracted values match the printed Net Amt column within ₹1.

10. PACK SIZE: Extract from the item description (e.g. 10KG, 1KG, 400GM, 80GM, 6KG).

Return output in the exact JSON schema requested.${memoryNote}`

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            metadata: {
              type: "OBJECT",
              properties: {
                partyCode: { 
                  type: "STRING", 
                  description: "3-letter uppercase CARE party code. If the distributor is 'MEDICINE HOUSE' use 'MDH'. If 'A B MARKETING' use 'ABM'. If 'MANSHI AGENCIES' use 'MNS'. If 'PATWARI PHARMA' use 'PWP'. If 'PREM AGENCY' or 'MEDICA' use 'PPH'. If 'C G MARKETING' use 'CGM'. If 'BEAUTY COSMETICS' use 'BCS'. If 'NAVKAR' use 'NVK'." 
                },
                partyName: { 
                  type: "STRING", 
                  description: "Distributor (Seller) Name. E.g. 'MEDICINE HOUSE' or 'A B MARKETING'. Do NOT use the buyer/customer name ('RATAN MEDICAL' or 'RATAN STORES')." 
                },
                invoiceNo: { type: "STRING", description: "Invoice Number" },
                date: { type: "STRING", description: "Invoice Date (DD/MM/YYYY or original)" }
              },
              required: ["partyCode", "partyName", "invoiceNo", "date"]
            },
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  productName: { type: "STRING", description: "Full Product Name including size and volume (e.g. FT GOLDEN HOUR GLOW SUNSCREEN 50ML)" },
                  qty: { type: "NUMBER", description: "Billed Quantity from Qty column (do not mix with Free Qty)" },
                  freeQty: { type: "NUMBER", description: "Free quantity from the FR or Free column only. Must be 0 if the FR cell for this row is blank or empty. NEVER use SCH% value as free qty." },
                  rate: { type: "NUMBER", description: "Unit Purchase Rate/PTR pre-discount" },
                  rawRate: { type: "NUMBER", description: "Unit Purchase Rate/PTR pre-discount (raw list rate)" },
                  mrp: { type: "NUMBER", description: "MRP per unit" },
                  pack: { type: "STRING", description: "Pack size / volume extracted from item description (e.g. 50ML, 80ML, 30ML, 10T)" },
                  hsn: { type: "STRING", description: "HSN Code" },
                  expiry: { type: "STRING", description: "Expiry Date (MM/YY)" },
                  discountPer: { type: "NUMBER", description: "Scheme discount percentage from SCH% column for THIS row. Default 0 if blank." },
                  discountAmt: { type: "NUMBER", description: "Scheme discount in rupees from SCHM AMT column for THIS row. If only SCH% exists, calculate as qty×rate×(SCH%/100). Default 0." },
                  gstPer: { type: "NUMBER", description: "GST percentage (e.g. 18.0) from the GST % column" },
                  taxable: { type: "NUMBER", description: "Taxable amount" },
                  netAmt: { type: "NUMBER", description: "Net amount" }
                },
                required: ["productName", "qty", "rate", "mrp"]
              }
            }
          },
          required: ["metadata", "items"]
        }
      }
    }

    const postData = JSON.stringify(payload)
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: '/v1beta/models/gemini-2.5-flash:generateContent',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      }
    }
    const apiResponse = await fetchWithRetry(options, postData)

    if (!apiResponse.ok) {
      const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 6)} (len: ${apiKey.length})` : 'undefined'
      return res.status(500).json({ error: `Gemini API call failed. Masked Key: ${maskedKey}. Response: ${apiResponse.body}` })
    }

    const resJson = JSON.parse(apiResponse.body)
    const candidate = resJson.candidates?.[0]
    const finishReason = candidate?.finishReason || 'UNKNOWN'

    // finishReason "OTHER" or "SAFETY" means Gemini stopped without producing content
    if (!candidate?.content) {
      const promptFeedback = resJson.promptFeedback?.blockReason || ''
      return res.status(500).json({
        error: `Gemini could not process this file (finishReason: ${finishReason}${promptFeedback ? ', blockReason: ' + promptFeedback : ''}). Try a different file or use the Protocol scan.`
      })
    }

    const responseText = candidate.content?.parts?.[0]?.text
    if (!responseText) {
      return res.status(500).json({ error: 'Gemini returned empty content.' })
    }

    const parsedData = JSON.parse(responseText)
    if (!parsedData.items || parsedData.items.length === 0) {
      return res.status(400).json({ error: 'No items were parsed from this invoice by the AI.' })
    }

    let finalPartyCode = String(parsedData.metadata.partyCode || 'MNS').padEnd(3, ' ').toUpperCase().substring(0, 3)
    if (req.query.randomParty === 'true') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let randCode = ''
      for (let i = 0; i < 3; i++) {
        randCode += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      finalPartyCode = randCode
    }

    // Map discountAmt to discAmt for normalizer
    const itemsWithDiscAmt = parsedData.items.map(it => ({
      ...it,
      discAmt: it.discountAmt !== undefined ? it.discountAmt : 0
    }))

    // Normalize through standard billing normalizer agent
    const normalizedRecords = normalizer.normalize(itemsWithDiscAmt, {
      partyCode: finalPartyCode,
      partyName: parsedData.metadata.partyName || 'UNKNOWN DISTRIBUTOR',
      invoiceNo: parsedData.metadata.invoiceNo || '000000',
      date: parsedData.metadata.date || ''
    })

    // Force VOU_NO to 0 — CARE assigns its own number
    normalizedRecords.forEach(r => { r.VOU_NO = 0 })

    // Upsert distributor format notes for memory
    if (req.query.storeOwnerId) {
      try {
        await supabaseAdmin.from('distributor_formats').upsert({
          store_owner_id: req.query.storeOwnerId,
          party_code: finalPartyCode,
          party_name: parsedData.metadata.partyName || 'UNKNOWN DISTRIBUTOR',
          format_notes: {
            has_free_qty_column: parsedData.items.some(i => i.freeQty > 0),
            has_scheme_pct_column: parsedData.items.some(i => i.discountPer > 0),
            has_schm_amt_column: parsedData.items.some(i => i.discountAmt > 0),
            has_cd_column: parsedData.items.some(i => i.discountPer > 0),
            sample_columns_observed: Object.keys(parsedData.items[0] || {}).join(','),
          },
          last_successful_invoice: parsedData.metadata.invoiceNo || '000000',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'store_owner_id,party_code' })
      } catch (err) {
        console.error('Failed to upsert distributor_formats:', err)
      }
    }

    const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB7556.sms')
    const templateBuffer = fs.readFileSync(templatePath)

    const smsBuffer = smsWriter.generate(normalizedRecords, templateBuffer)

    const rawInvNo = String(parsedData.metadata.invoiceNo || '0').replace(/[^0-9]/g, '')
    const invNo = rawInvNo ? rawInvNo.slice(-6) : '000000'
    const filename = `RATADEH_${finalPartyCode}CRB${invNo}.sms`

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(smsBuffer)

  } catch (err) {
    console.error('convert-bill-ai error:', err)
    res.status(500).json({ error: err.message })
  }
}
