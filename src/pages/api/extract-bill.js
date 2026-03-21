import { createClient } from '@supabase/supabase-js'

function getCurrentMonthYear() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getResetDate() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const SCAN_LIMIT = 30

const PROMPT = `You are extracting data from a pharmacy/FMCG purchase bill image for import into accounting software. Be extremely precise.

CRITICAL COLUMN MAPPING RULES:
- "S.Rate" or "Rate" or "Pur.Rate" = the RATE field (purchase rate per unit)
- "MRP" = the MRP field
- "CS" or "Cases" = cases ordered (NOT qty)
- "EA" or "Pcs" or "Qty" = the QTY field (individual units/pieces)
- "Gross.Amt" or "Gross Amount" = GROS_AMT (qty x rate)
- "Net.Amt" or "Net Amount" = the net payable per line
- "*Disc+Gst Benefit" or "CD/RD/WSH" = IGNORE these columns entirely, set disc=0
- "CGST%" and "SGST%" = these together make total GST (add both for gst field)
- "MNF B.Code" or "Batch" = batch number
- "HSN Code" = hsn field
- If bill says "Page X of Y" extract only the items visible on the page provided

FOR QTY: use the EA/Pcs/individual unit column only. If only cases (CS) column exists, multiply cases by the number in the pack size (e.g. CS=2, pack=24x300g means qty=48).

FOR RATE: use S.Rate column. This is per individual unit, not per case.

FOR DISC: only use clearly labelled discount % column. Ignore GST benefit columns. Default 0.

Return ONLY valid JSON, no markdown, no explanation:

{
  "header": {
    "distName": "distributor company name from top of bill",
    "partyCode": "first 3 letters of distributor name uppercase",
    "address": "distributor full address",
    "billNo": "bill or invoice number as string",
    "billDate": "YYYY-MM-DD",
    "dueDate": "YYYY-MM-DD, same as billDate if not shown"
  },
  "items": [
    {
      "prodName": "product name exactly as printed",
      "company": "manufacturer name if shown else empty",
      "prodCode": "empty string",
      "pack": "pack size e.g. 300G or 75G or 1*10",
      "qty": quantity as integer from EA column,
      "rate": purchase rate per unit as number from S.Rate column,
      "mrp": MRP per unit as number,
      "disc": discount percentage as number (0 if not a clear discount %),
      "gst": total GST% as number (CGST% + SGST%, default 5),
      "batch": "batch number from MNF B.Code column if shown else empty",
      "expiry": "MM/YY if shown else empty",
      "hsn": "HSN code as string"
    }
  ],
  "confidence": "high" or "low"
}`

async function callClaude(images, model, apiKey) {
  const imageContent = images.map(img => ({
    type: 'image',
    source: { type: 'base64', media_type: img.mimeType || 'image/jpeg', data: img.base64 }
  }))

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: [...imageContent, { type: 'text', text: PROMPT }]
      }]
    })
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.error?.message || 'API error')
  }

  const result = await response.json()
  const text = result.content?.[0]?.text || ''
  const cleaned = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'OCR service not configured yet. Please contact MediClan.' })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { images, storeOwnerId } = req.body
  // images = [{ base64, mimeType }, ...] — array to support multi-page

  if (!images?.length || !storeOwnerId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // ── 1. CHECK QUOTA ──────────────────────────────────────────────────────────
  const monthYear = getCurrentMonthYear()
  const { data: scanRow } = await supabaseAdmin
    .from('bill_scans')
    .select('scans_used, scan_limit')
    .eq('store_owner_id', storeOwnerId)
    .eq('month_year', monthYear)
    .maybeSingle()

  const scansUsed = scanRow?.scans_used ?? 0
  const scanLimit = scanRow?.scan_limit ?? SCAN_LIMIT

  if (scansUsed >= scanLimit) {
    return res.status(429).json({
      error: `Monthly limit of ${scanLimit} scans reached. Resets on ${getResetDate()}.`,
      scansUsed, scanLimit,
    })
  }

  // ── 2. TRY HAIKU FIRST ──────────────────────────────────────────────────────
  let data
  let usedSonnet = false

  try {
    // Single page → Haiku. Multiple pages → Sonnet directly (needs more power)
    if (images.length > 1) {
      data = await callClaude(images, 'claude-sonnet-4-6', process.env.ANTHROPIC_API_KEY)
      usedSonnet = true
    } else {
      data = await callClaude(images, 'claude-haiku-4-5-20251001', process.env.ANTHROPIC_API_KEY)

      // If Haiku says low confidence OR fewer than 1 item extracted → retry with Sonnet
      if (data.confidence === 'low' || !data.items?.length) {
        console.log('Haiku low confidence, retrying with Sonnet')
        data = await callClaude(images, 'claude-sonnet-4-6', process.env.ANTHROPIC_API_KEY)
        usedSonnet = true
      }
    }
  } catch (e) {
    console.error('Claude error:', e.message)
    if (e.message.includes('credit')) {
      return res.status(402).json({ error: 'Insufficient API credits. Please contact MediClan.' })
    }
    return res.status(502).json({ error: 'Could not read bill. Please try a clearer photo.' })
  }

  // ── 3. INCREMENT SCAN COUNT ─────────────────────────────────────────────────
  await supabaseAdmin
    .from('bill_scans')
    .upsert({
      store_owner_id: storeOwnerId,
      month_year: monthYear,
      scans_used: scansUsed + 1,
      scan_limit: scanLimit,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'store_owner_id,month_year' })

  return res.status(200).json({
    success: true,
    data,
    scansUsed: scansUsed + 1,
    scanLimit,
    model: usedSonnet ? 'sonnet' : 'haiku',
  })
}

export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }