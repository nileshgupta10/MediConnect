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

const PROMPT = `You are extracting data from a pharmacy purchase bill image (or multiple pages of the same bill) for import into accounting software.

Extract and return ONLY a valid JSON object with this exact structure — no explanation, no markdown, just raw JSON:

{
  "header": {
    "distName": "distributor full name",
    "partyCode": "first 3 letters of distributor name uppercase",
    "address": "distributor address if visible, else empty string",
    "billNo": "invoice/bill number as string",
    "billDate": "YYYY-MM-DD format",
    "dueDate": "YYYY-MM-DD format, same as billDate if not visible"
  },
  "items": [
    {
      "prodName": "product name",
      "company": "manufacturer name if visible, else empty string",
      "prodCode": "product code if visible, else empty string",
      "pack": "pack size e.g. 1*10, default 1*10 if not visible",
      "qty": quantity as number,
      "rate": purchase rate as number,
      "mrp": MRP as number,
      "disc": discount percentage as number (0 if not visible),
      "gst": GST percentage as number (5 if not visible),
      "batch": "batch number if visible, else empty string",
      "expiry": "MM/YY if visible, else empty string",
      "hsn": "HSN code if visible, else empty string"
    }
  ],
  "confidence": "high" or "low"
}

Rules:
- Extract ALL line items from ALL pages provided
- Do not duplicate items that appear on multiple pages
- qty, rate, mrp, disc, gst must be numbers not strings
- Set confidence to "low" if bill is blurry, handwritten, or many fields are unclear
- Return ONLY the JSON, nothing else`

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