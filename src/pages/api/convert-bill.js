import fs from 'fs'
import path from 'path'
import normalizer from '../../lib/agents/normalizer'
import smsWriter from '../../lib/agents/smsWriter'
import patwari from '../../lib/protocols/patwari'

const PROTOCOLS = [patwari]

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}

function detectProtocol(csvText) {
  const upper = csvText.toUpperCase()
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
    const { csvText } = req.body
    if (!csvText) return res.status(400).json({ error: 'No CSV data received' })

    const protocol = detectProtocol(csvText)
    if (!protocol) {
      return res.status(400).json({ error: 'Could not identify distributor. Only Patwari supported currently.' })
    }

    const rows = parseCSV(csvText)
    if (rows.length === 0) return res.status(400).json({ error: 'No data rows found in file' })

    const metadata = protocol.getMetadata(rows)
    const items = protocol.mapRows(rows)
    const records = normalizer.normalize(items, metadata)

    const templatePath = path.join(process.cwd(), 'public', 'templates', 'RATADEH_MMPCRB154288.sms')
    const templateBuffer = fs.readFileSync(templatePath)

    const smsBuffer = smsWriter.generate(records, templateBuffer)

    const invNo = String(metadata.invoiceNo).replace(/[^0-9]/g, '').padStart(6, '0')
    const filename = `RATADEH_${metadata.partyCode}CRB${invNo}.sms`

    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(smsBuffer)

  } catch (err) {
    console.error('convert-bill error:', err)
    res.status(500).json({ error: err.message })
  }
}