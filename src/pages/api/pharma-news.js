// src/pages/api/pharma-news.js
// Fetches pharma news from Google News RSS. No new npm packages — uses built-in fetch + regex XML parsing.

// ── In-memory cache ──────────────────────────────────────────────────────────
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

let nationalCache = null
let nationalCacheAt = 0
let intlCache = null
let intlCacheAt = 0

// Local cache: Map keyed by normalised address string, capped at 50 entries
const localCacheMap = new Map()
const MAX_LOCAL_CACHE = 50

function getLocalCache(key) {
  const entry = localCacheMap.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { localCacheMap.delete(key); return null }
  return entry.data
}
function setLocalCache(key, data) {
  if (localCacheMap.size >= MAX_LOCAL_CACHE) {
    // Delete the oldest entry
    const oldest = localCacheMap.keys().next().value
    localCacheMap.delete(oldest)
  }
  localCacheMap.set(key, { data, ts: Date.now() })
}

// ── Address parser ────────────────────────────────────────────────────────────
function parseLocation(addressString) {
  if (!addressString || !addressString.trim()) return { city: null, state: null }
  const segments = addressString.split(',').map(s => s.trim()).filter(Boolean)
  // Drop trailing "India" or country-like segment
  if (segments.length > 0) {
    const last = segments[segments.length - 1]
    if (/^india$/i.test(last) || /^[a-z\s]+$/i.test(last) && last.length < 30 && !/\d/.test(last) && segments.length > 2) {
      // Only drop if it looks like a country name (no digits, not too short to be a city)
      if (/^india$/i.test(last)) segments.pop()
    }
  }
  // Strip trailing pin/zip codes from each segment
  const cleaned = segments.map(s => s.replace(/\s*\d{5,6}\s*$/, '').trim()).filter(Boolean)
  if (cleaned.length === 0) return { city: null, state: null }
  const state = cleaned[cleaned.length - 1] || null
  const city = cleaned.length >= 2 ? cleaned[cleaned.length - 2] : null
  return { city, state }
}

// ── RSS helpers ───────────────────────────────────────────────────────────────
function decodeEntities(str) {
  return String(str || '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
}

function extractSource(itemXml, title) {
  const srcMatch = itemXml.match(/<source[^>]*>([^<]+)<\/source>/)
  if (srcMatch) return decodeEntities(srcMatch[1].trim())
  // Fall back: last " - " in title
  const idx = title.lastIndexOf(' - ')
  if (idx !== -1) return title.slice(idx + 3).trim()
  return ''
}

function parseRSS(xml, cap = 6) {
  const items = []
  const parts = xml.split('<item>')
  for (let i = 1; i < parts.length && items.length < cap; i++) {
    const chunk = parts[i].split('</item>')[0]
    const titleMatch = chunk.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/) ||
                       chunk.match(/<title>([^<]+)<\/title>/)
    const linkMatch  = chunk.match(/<link>([^<]+)<\/link>/) ||
                       chunk.match(/<link\s*\/>([^<]+)/) ||
                       chunk.match(/<feedburner:origLink>([^<]+)<\/feedburner:origLink>/)
    const dateMatch  = chunk.match(/<pubDate>([^<]+)<\/pubDate>/)
    if (!titleMatch || !linkMatch) continue
    const title = decodeEntities(titleMatch[1].trim())
    const link  = linkMatch[1].trim()
    const pubDate = dateMatch ? dateMatch[1].trim() : ''
    const source = extractSource(chunk, title)
    items.push({ title, link, pubDate, source })
  }
  return items
}

async function fetchRSS(query, hl, gl, ceid, cap = 6) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'MediClanNewsBot/1.0' } })
    clearTimeout(timer)
    if (!res.ok) return []
    const xml = await res.text()
    return parseRSS(xml, cap)
  } catch {
    return []
  }
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function dedupByLink(items) {
  const seen = new Set()
  return items.filter(it => { if (seen.has(it.link)) return false; seen.add(it.link); return true })
}

function pickTwo(arr) {
  return shuffle(arr).slice(0, 2)
}

// ── National query pool ───────────────────────────────────────────────────────
const NATIONAL_QUERIES = [
  'India pharma news',
  'India FDA drug approval',
  'CDSCO India pharmacy regulation',
  'India pharmacist news',
  'India generic medicine policy',
]

// ── International query pool ─────────────────────────────────────────────────
const INTL_QUERIES = [
  'global pharma industry news',
  'FDA drug approval',
  'WHO pharmaceutical',
  'pharma technology innovation',
  'global clinical trial news',
]

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const address = req.query.address || ''
    const { city, state } = parseLocation(address)
    const localAvailable = !!(city || state)
    const cacheKey = address.trim().toLowerCase()

    // ── LOCAL ────────────────────────────────────────────────────────────────
    let local = []
    if (localAvailable) {
      const cached = getLocalCache(cacheKey)
      if (cached) {
        local = cached
      } else {
        const fetches = []
        if (city)  fetches.push(fetchRSS(`${city} pharmacy OR chemist OR medical store`, 'en-IN', 'IN', 'IN:en', 6))
        if (state) fetches.push(fetchRSS(`${state} FDA drug OR pharmacy regulation`, 'en-IN', 'IN', 'IN:en', 6))
        const results = await Promise.all(fetches)
        const combined = dedupByLink(shuffle(results.flat())).slice(0, 6)
        local = combined
        setLocalCache(cacheKey, combined)
      }
    }

    // ── NATIONAL ─────────────────────────────────────────────────────────────
    let national = []
    if (nationalCache && Date.now() - nationalCacheAt < CACHE_TTL) {
      national = nationalCache
    } else {
      const qs = pickTwo(NATIONAL_QUERIES)
      const results = await Promise.all(qs.map(q => fetchRSS(q, 'en-IN', 'IN', 'IN:en', 6)))
      national = dedupByLink(shuffle(results.flat())).slice(0, 6)
      nationalCache = national
      nationalCacheAt = Date.now()
    }

    // ── INTERNATIONAL ─────────────────────────────────────────────────────────
    let international = []
    if (intlCache && Date.now() - intlCacheAt < CACHE_TTL) {
      international = intlCache
    } else {
      const qs = pickTwo(INTL_QUERIES)
      const results = await Promise.all(qs.map(q => fetchRSS(q, 'en-US', 'US', 'US:en', 6)))
      international = dedupByLink(shuffle(results.flat())).slice(0, 6)
      intlCache = international
      intlCacheAt = Date.now()
    }

    return res.status(200).json({ local, national, international, localAvailable })
  } catch {
    return res.status(200).json({ local: [], national: [], international: [], localAvailable: false })
  }
}
