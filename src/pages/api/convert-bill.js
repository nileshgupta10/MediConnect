import fs from 'fs'
import path from 'path'
import normalizer from '../../lib/agents/normalizer'
import smsWriter from '../../lib/agents/smsWriter'
import patwari from '../../lib/protocols/patwari'
import medica from '../../lib/protocols/medica'
import beautyCosmetics from '../../lib/protocols/beauty'
import manshi from '../../lib/protocols/manshi'
import manshiLeap from '../../lib/protocols/manshiLeap'
import navkar from '../../lib/protocols/navkar'
import cgMarketing from '../../lib/protocols/cgMarketing'
import abmarketing from '../../lib/protocols/abmarketing'
import medicineHouse from '../../lib/protocols/medicineHouse'

// Check Manshi Leap before Manshi because the Leap PDF also contains shared Manshi footer text.
const PROTOCOLS = [patwari, medica, cgMarketing, beautyCosmetics, manshiLeap, manshi, navkar, abmarketing, medicineHouse]

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
    for (const pattern of protocol.identifyPatterns) {
      if (upper.includes(pattern.toUpperCase())) return protocol
    }
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
        return await generateSMS(protocol, rows, res, req.query.randomParty === 'true')
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
    if (!protocol) {
      return res.status(400).json({ error: 'Could not identify distributor. Supported: Patwari, Medica, Beauty Cosmetics, Manshi, ManshiLeap, Navkar, CG Marketing, AB Marketing, Medicine House.' })
    }

    // For PDFs — pass raw text to protocol
    // For CSVs — parse into rows
    let rows
    if (isPDF) {
      const lines = textContent.split('\n').map(l => l.trim()).filter(l => l)
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
      if (req.query.randomParty === 'true') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        let randCode = ''
        for (let i = 0; i < 3; i++) {
          randCode += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        finalPartyCode = randCode
      }
      const records = normalizer.normalize(items, { ...metadata, partyCode: finalPartyCode })
      const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB7556.sms')
      const templateBuffer = fs.readFileSync(templatePath)
      const smsBuffer = smsWriter.generate(records, templateBuffer)
      const invNo = String(metadata.invoiceNo).replace(/[^0-9]/g, '').padStart(6, '0')
      const filename = `RATADEH_${finalPartyCode}CRB${invNo}.sms`
      
      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return res.send(smsBuffer)
    } else {
      rows = parseCSV(textContent)
    }

    if (!rows || rows.length === 0) return res.status(400).json({ error: 'No data rows found in file.' })

    return await generateSMS(protocol, rows, res, req.query.randomParty === 'true')

  } catch (err) {
    console.error('convert-bill error:', err)
    res.status(500).json({ error: err.message })
  }
}

async function generateSMS(protocol, rows, res, randomParty) {
  const metadata = protocol.getMetadata(rows)
  const items = protocol.mapRows(rows)
  let finalPartyCode = String(metadata.partyCode || 'GEN').toUpperCase().substring(0, 3)
  if (randomParty) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let randCode = ''
    for (let i = 0; i < 3; i++) {
      randCode += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    finalPartyCode = randCode
  }
  const records = normalizer.normalize(items, { ...metadata, partyCode: finalPartyCode })

  const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB7556.sms')
  const templateBuffer = fs.readFileSync(templatePath)

  const smsBuffer = smsWriter.generate(records, templateBuffer)

  const invNo = String(metadata.invoiceNo).replace(/[^0-9]/g, '').padStart(6, '0')
  const filename = `RATADEH_${finalPartyCode}CRB${invNo}.sms`

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(smsBuffer)
}
