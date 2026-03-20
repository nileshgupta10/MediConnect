// ─── /api/extract-bill ────────────────────────────────────────────────────────
// Server-side only. API key never exposed to browser.
// Receives: { imageBase64, mimeType, storeOwnerId }
// Returns:  { success, data } or { error }

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // server-only, never exposed
)

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY  // server-only, never exposed
const SCAN_LIMIT = 30

function getCurrentMonthYear() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getResetDate() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageBase64, mimeType, storeOwnerId } = req.body

  if (!imageBase64 || !storeOwnerId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // ── 1. CHECK QUOTA ──────────────────────────────────────────────────────────
  const monthYear = getCurrentMonthYear()

  const { data: scanRow, error: scanErr } = await supabaseAdmin
    .from('bill_scans')
    .select('scans_used, scan_limit')
    .eq('store_owner_id', storeOwnerId)
    .eq('month_year', monthYear)
    .maybeSingle()

  if (scanErr) return res.status(500).json({ error: 'Could not check scan quota' })

  const scansUsed  = scanRow?.scans_used  ?? 0
  const scanLimit  = scanRow?.scan_limit  ?? SCAN_LIMIT

  if (scansUsed >= scanLimit) {
    return res.status(429).json({
      error: `Monthly limit of ${scanLimit} scans reached. Resets on ${getResetDate()}.`,
      scansUsed, scanLimit,
    })
  }

  // ── 2. CALL CLAUDE HAIKU ────────────────────────────────────────────────────
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'OCR service not configured yet. Please contact MediClan.' })
  }

  const prompt = `You are extracting data from a pharmacy purchase bill image for import into accounting software.

Extract and return ONLY a valid JSON object with this exact structure — no explanation, no markdown, just JSON:

{
  "header": {
    "distName": "distributor full name",
    "partyCode": "first 3 letters of distributor name in uppercase",
    "address": "distributor address if visible, else empty string",
    "billNo": "invoice/bill number as string",
    "billDate": "date in YYYY-MM-DD format",
    "dueDate": "due date in YYYY-MM-DD format, same as billDate if not visible"
  },
  "items": [
    {
      "prodName": "product name",
      "company": "manufacturer name if visible, else empty string",
      "prodCode": "product code if visible, else empty string",
      "pack": "pack size e.g. 1*10, if not visible use 1*10",
      "qty": number,
      "rate": number,
      "mrp": number,
      "disc": discount percentage as number (0 if not visible),
      "gst": GST percentage as number (5 if not visible),
      "batch": "batch number if visible, else empty string",
      "expiry": "expiry as MM/YY if visible, else empty string",
      "hsn": "HSN code if visible, else empty string"
    }
  ]
}

Rules:
- Extract ALL line items visible on the bill
- If a value is not clearly visible, use the defaults specified
- billDate and dueDate must be YYYY-MM-DD format
- qty, rate, mrp, disc, gst must be numbers not strings
- Return ONLY the JSON, nothing else`

  let claudeData
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: imageBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return res.status(502).json({ error: 'OCR service error. Please try again.' })
    }

    const result = await response.json()
    const text = result.content?.[0]?.text || ''

    // Strip any accidental markdown fences
    const cleaned = text.replace(/```json|```/g, '').trim()
    claudeData = JSON.parse(cleaned)

  } catch (e) {
    console.error('Parse error:', e)
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
    data: claudeData,
    scansUsed: scansUsed + 1,
    scanLimit,
  })
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }