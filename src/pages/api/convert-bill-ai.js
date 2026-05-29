import fs from 'fs'
import path from 'path'
import normalizer from '../../lib/agents/normalizer'
import smsWriter from '../../lib/agents/smsWriter'

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

    const base64Data = fileBuffer.toString('base64')
    
    // Determine mimeType
    let mimeType = 'image/jpeg'
    const lowerName = fileName.toLowerCase()
    if (lowerName.endsWith('.pdf')) {
      mimeType = 'application/pdf'
    } else if (lowerName.endsWith('.png')) {
      mimeType = 'image/png'
    } else if (lowerName.endsWith('.webp')) {
      mimeType = 'image/webp'
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured in .env.local' })
    }

    const promptText = `You are a highly precise pharmaceutical invoice data extractor. 
Locate the invoice's line items table and extract all items.
Extract the Product Name (max 30 characters), Quantity, Free Quantity, Unit Purchase Rate/PTR (pre-discount), MRP, HSN code, Expiry (MM/YY), Discount %, GST %, Taxable Amount, and Net Amount.
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
                partyCode: { type: "STRING", description: "3-letter uppercase CARE party code if recognized (e.g. MNS for Manshi, PWP for Patwari, etc.), otherwise default to MNS" },
                partyName: { type: "STRING", description: "Distributor Name" },
                invoiceNo: { type: "STRING", description: "Invoice Number" },
                date: { type: "STRING", description: "Invoice Date (DD/MM/YYYY or original)" }
              },
              required: ["partyName", "invoiceNo", "date"]
            },
            items: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  productName: { type: "STRING", description: "Product Name (max 30 characters)" },
                  qty: { type: "NUMBER", description: "Billed Quantity" },
                  freeQty: { type: "NUMBER", description: "Free Quantity if any" },
                  rate: { type: "NUMBER", description: "Unit Purchase Rate/PTR pre-discount" },
                  rawRate: { type: "NUMBER", description: "Unit Purchase Rate/PTR pre-discount (raw list rate)" },
                  mrp: { type: "NUMBER", description: "MRP per unit" },
                  pack: { type: "STRING", description: "Pack size (e.g. 10T, 15GM, 1N)" },
                  hsn: { type: "STRING", description: "HSN Code" },
                  expiry: { type: "STRING", description: "Expiry Date (MM/YY)" },
                  discountPer: { type: "NUMBER", description: "Discount percentage" },
                  gstPer: { type: "NUMBER", description: "GST percentage" },
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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(500).json({ error: `Gemini API call failed: ${errText}` })
    }

    const resJson = await response.json()
    const responseText = resJson.candidates?.[0]?.content?.parts?.[0]?.text
    if (!responseText) {
      return res.status(500).json({ error: 'Gemini returned empty content.' })
    }

    const parsedData = JSON.parse(responseText)
    if (!parsedData.items || parsedData.items.length === 0) {
      return res.status(400).json({ error: 'No items were parsed from this invoice by the AI.' })
    }

    // Normalize through standard billing normalizer agent
    const normalizedRecords = normalizer.normalize(parsedData.items, {
      partyCode: parsedData.metadata.partyCode || 'MNS',
      partyName: parsedData.metadata.partyName || 'MANSHI AGENCIES',
      invoiceNo: parsedData.metadata.invoiceNo || '000000',
      date: parsedData.metadata.date || ''
    })

    const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB7556.sms')
    const templateBuffer = fs.readFileSync(templatePath)

    const smsBuffer = smsWriter.generate(normalizedRecords, templateBuffer)

    const invNo = String(parsedData.metadata.invoiceNo).replace(/[^0-9]/g, '').padStart(6, '0')
    const finalPartyCode = String(parsedData.metadata.partyCode || 'MNS').toUpperCase().substring(0, 3)
    const filename = `RATADEH_${finalPartyCode}CRB${invNo}.sms`

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(smsBuffer)

  } catch (err) {
    console.error('convert-bill-ai error:', err)
    res.status(500).json({ error: err.message })
  }
}
