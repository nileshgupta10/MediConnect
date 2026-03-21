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

const PROMPT = `You are extracting data from a pharmacy/FMCG purchase bill image for import into CARE accounting software. Be extremely precise.

CRITICAL COLUMN MAPPING RULES:
- "S.Rate" or "Rate" or "Pur.Rate" = the RATE field (purchase rate per unit, NOT MRP)
- "MRP" = the MRP field (maximum retail price, always higher than rate)
- "CS" or "Cases" = cases ordered — do NOT use this as qty
- "EA" or "Pcs" or "Qty" = the QTY field (individual units/pieces) — USE THIS for qty
- "Gross.Amt" or "Gross Amount" = qty x rate (before discount)
- "Net.Amt" or "Net Amount" = net payable per line (after discount, before GST)
- "*Disc+Gst Benefit" or "CD/RD/WSH" or "Scheme" = IGNORE these columns, set disc=0
- "CGST%" and "SGST%" = these two together make total GST% (e.g. CGST 2.5% + SGST 2.5% = 5%)
- "MNF B.Code" or "Batch No" or "Batch" = batch number (alphanumeric code like 53510451DA)
- "HSN Code" or "HSN" = hsn field

IMPORTANT — DO NOT CONFUSE RATE AND MRP:
- RATE is always LOWER than MRP (it is what the store pays)
- MRP is always HIGHER (it is what the customer pays)
- If S.Rate column shows 126.70 and MRP shows 290.00 — rate=126.70, mrp=290.00
- Never put the MRP value in the rate field

FOR QTY: Always use the EA/Pcs/individual unit column. Never use Cases (CS) column directly.
If only CS column exists, multiply: CS × units_per_case (from pack size, e.g. 24x300g → 24 units per case).

FOR DISC: Only use clearly labelled "Disc%" or "Discount%" column. Ignore all scheme/benefit columns. Default 0.

FOR BATCH: Copy exactly as printed (e.g. 53510451DA, 60330451DA). These are alphanumeric codes.

Return ONLY valid JSON, no markdown, no explanation:

{
  "header": {
    "distName": "distributor company name from top of bill",
    "partyCode": "first 3 letters of distributor name uppercase",
    "address": "distributor full address as single string",
    "billNo": "bill or invoice number exactly as printed",
    "billDate": "YYYY-MM-DD",
    "dueDate": "YYYY-MM-DD, same as billDate if not shown"
  },
  "items": [
    {
      "prodName": "product name exactly as printed, max 30 chars",
      "company": "manufacturer name if shown, else empty string",
      "prodCode": "",
      "pack": "pack size e.g. 24x300G or 1*10, max 6 chars",
      "qty": integer from EA/Pcs column only,
      "rate": purchase rate per unit from S.Rate column as decimal number,
      "mrp": MRP per unit as decimal number (must be >= rate),
      "disc": discount percentage as decimal number (0 if no clear discount column),
      "gst": total GST% as number (CGST% + SGST%, default 5 if not shown),
      "batch": "batch code exactly as printed e.g. 53510451DA",
      "expiry": "MM/YY if shown else empty string",
      "hsn": "HSN code as string e.g. 1901 10 90"
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
      max_tokens: 4000,
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
      scansUsed,
      scanLimit,
    })
  }

  // ── 2. CALL CLAUDE ──────────────────────────────────────────────────────────
  let data
  let usedSonnet = false

  try {
    if (images.length > 1) {
      // Multi-page → always use Sonnet (needs more power)
      data = await callClaude(images, 'claude-sonnet-4-6', process.env.ANTHROPIC_API_KEY)
      usedSonnet = true
    } else {
      // Single page → try Haiku first (cheaper)
      data = await callClaude(images, 'claude-haiku-4-5-20251001', process.env.ANTHROPIC_API_KEY)

      // If Haiku is not confident or extracted 0 items → retry with Sonnet
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