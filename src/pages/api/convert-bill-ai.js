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

    const promptText = `You are a highly precise pharmaceutical invoice data extractor.
Locate the invoice's line items table and extract all items.
IMPORTANT DIRECTIVES FOR VISUAL AND COLUMN ACCURACY:
1. Distributor (Seller) Disambiguation: Identify the DISTRIBUTOR (the company SELLING the products, e.g. "MEDICINE HOUSE" or "A B MARKETING"). This is always the main company branding at the very top of the invoice.
   - ⚠️ NEVER confuse this with the Customer/Buyer (e.g. "RATAN MEDICAL" or "RATAN STORES") which is listed in the "To" / "Ship To" billing section. 
2. Product Volume / Sizes: Products with different volume sizes (e.g. 50ML, 80ML, 100ML, 30ML, 15GM) MUST be treated as completely separate, unique products. Capture their full names including the brand, volume, and size (e.g. "FT GOLDEN HOUR GLOW SUNSCREEN 50ML" and "FT GOLDEN HOUR GLOW SUNSCREEN 80ML").
3. Quantity Columns: Systematically locate the "Qty" (Billed Quantity) column and the "Free" (Free/Scheme Quantity) column. Do not mix them up.
4. Discount vs GST Column Alignment: Locate "Sch. %" (Scheme Discount %), "Rs.Disc" (Rupee Discount), and "C.Disc %" (Cash Discount %) columns. Sum them up or extract the primary discount to "discountPer".
   - ⚠️ DANGER: Locate the "GST %" column (normally values like 5, 12, 18, 28) and extract it to "gstPer".
   - ⚠️ NEVER confuse "GST %" (18%) with the discount columns. The discount in this invoice is the "Sch. %" column (which is 11%), not the "GST %" column (which is 18%).
5. Pack Size: Extract the pack size (e.g. "50ML", "80ML", "30ML", "100ML", "10T") to the "pack" field.

For the metadata, extract the distributor's name, invoice number, and invoice date.
Represent the output exactly in the requested JSON structure.`

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
                  freeQty: { type: "NUMBER", description: "Free Quantity from Free column (default to 0 if empty or none)" },
                  rate: { type: "NUMBER", description: "Unit Purchase Rate/PTR pre-discount" },
                  rawRate: { type: "NUMBER", description: "Unit Purchase Rate/PTR pre-discount (raw list rate)" },
                  mrp: { type: "NUMBER", description: "MRP per unit" },
                  pack: { type: "STRING", description: "Pack size / volume extracted from item description (e.g. 50ML, 80ML, 30ML, 10T)" },
                  hsn: { type: "STRING", description: "HSN Code" },
                  expiry: { type: "STRING", description: "Expiry Date (MM/YY)" },
                  discountPer: { type: "NUMBER", description: "Total discount percentage from Sch. % or C.Disc % columns (e.g. 11.0). Must NEVER contain the GST percentage (e.g. 18.0)!" },
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

    let finalPartyCode = String(parsedData.metadata.partyCode || 'MNS').toUpperCase().substring(0, 3)
    if (req.query.randomParty === 'true') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      let randCode = ''
      for (let i = 0; i < 3; i++) {
        randCode += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      finalPartyCode = randCode
    }

    // Normalize through standard billing normalizer agent
    const normalizedRecords = normalizer.normalize(parsedData.items, {
      partyCode: finalPartyCode,
      partyName: parsedData.metadata.partyName || 'UNKNOWN DISTRIBUTOR',
      invoiceNo: parsedData.metadata.invoiceNo || '000000',
      date: parsedData.metadata.date || ''
    })

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
