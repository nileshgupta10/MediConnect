// src/pages/api/vault/upload.js
// Handles prescription image uploads:
//   1. Authenticates the store via getStoreOwnerId
//   2. Validates file type (jpg/png/webp/heic) and size (≤10MB) on raw input
//   3. Compresses the image server-side via sharp (→ JPEG, 75q, max 1600px)
//   4. Verifies the target patient belongs to this store
//   5. Uploads the compressed buffer to the private prescription-vault bucket
//      using the service role key — never a public URL
//   6. Inserts a vault_prescription_records row; on failure cleans up the orphaned file

import sharp from 'sharp';
import { getStoreOwnerId } from '../../../lib/khata-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Next.js default body parser can't handle binary — disable it
export const config = { api: { bodyParser: false } };

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Simple multipart parser using the raw request body
async function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Parse multipart/form-data manually (handles multiple file fields "file" + text fields)
function parseMultipart(body, boundary) {
  const parts = {};
  const boundaryBuffer = Buffer.from('--' + boundary);
  let start = 0;

  while (start < body.length) {
    const boundaryIdx = body.indexOf(boundaryBuffer, start);
    if (boundaryIdx === -1) break;
    const headerStart = boundaryIdx + boundaryBuffer.length + 2; // skip \r\n
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), headerStart);
    if (headerEnd === -1) break;

    const headerStr = body.slice(headerStart, headerEnd).toString();
    const dataStart = headerEnd + 4; // skip \r\n\r\n
    const nextBoundary = body.indexOf(boundaryBuffer, dataStart);
    const dataEnd = nextBoundary === -1 ? body.length : nextBoundary - 2; // strip trailing \r\n
    const data = body.slice(dataStart, dataEnd);

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]+)"/);
    const contentTypeMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);

    if (nameMatch) {
      const fieldName = nameMatch[1];
      if (filenameMatch) {
        if (!parts[fieldName]) {
          parts[fieldName] = [];
        }
        parts[fieldName].push({
          filename: filenameMatch[1],
          contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
          data,
        });
      } else {
        parts[fieldName] = data.toString().trim();
      }
    }
    start = nextBoundary === -1 ? body.length : nextBoundary;
  }
  return parts;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  // Parse multipart body
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (!boundaryMatch) {
    return res.status(400).json({ error: 'Expected multipart/form-data with boundary.' });
  }

  let parts;
  try {
    const rawBody = await readRawBody(req);
    parts = parseMultipart(rawBody, boundaryMatch[1]);
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse upload: ' + err.message });
  }

  const { patient_id, record_date, notes } = parts;
  const files = Array.isArray(parts.file) ? parts.file : (parts.file ? [parts.file] : []);

  const hasFile  = files.length > 0;
  const hasNotes = !!(typeof notes === 'string' && notes.trim());

  if (!patient_id) return res.status(400).json({ error: 'patient_id is required.' });
  if (!record_date) return res.status(400).json({ error: 'record_date is required.' });
  if (!hasFile && !hasNotes) {
    return res.status(400).json({ error: 'Provide an image, notes, or both.' });
  }

  // ── Validate files ────────────────────────────────────────────────
  if (files.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 pages allowed per upload.' });
  }

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const pageNum = i + 1;
    if (!ALLOWED_MIME_TYPES.includes(f.contentType)) {
      return res.status(400).json({
        error: `Page ${pageNum}: Invalid file type "${f.contentType}". Allowed: JPG, PNG, WEBP, HEIC only.`,
      });
    }
    if (f.data.length > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (f.data.length / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        error: `Page ${pageNum}: File is ${sizeMB} MB. Maximum allowed size is 10 MB.`,
      });
    }
  }

  // ── Verify patient belongs to this store (never trust client) ────
  const { data: patient, error: patientErr } = await supabaseAdmin
    .from('vault_patients')
    .select('id')
    .eq('id', patient_id)
    .eq('store_id', storeOwnerId)
    .is('deleted_at', null)
    .single();

  if (patientErr || !patient) {
    return res.status(403).json({ error: 'Patient not found or access denied.' });
  }

  // ── Compress + upload images ────────────────────────────────────
  const uploadedPaths = [];
  const timestamp = Date.now();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let compressedBuffer;
    try {
      compressedBuffer = await sharp(file.data)
        .rotate()                        // auto-correct EXIF orientation
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 75, progressive: true })
        .toBuffer();

      const origKB = (file.data.length / 1024).toFixed(0);
      const compKB = (compressedBuffer.length / 1024).toFixed(0);
      console.log(`[vault/upload] compressed page ${i} ${origKB} KB → ${compKB} KB (${file.contentType})`);
    } catch (compErr) {
      console.error(`[vault/upload] page ${i} compression error:`, compErr.message);
      if (uploadedPaths.length > 0) {
        await supabaseAdmin.storage.from('prescription-vault').remove(uploadedPaths);
      }
      return res.status(500).json({ error: `Page ${i + 1} image compression failed: ` + compErr.message });
    }

    const storagePath = `${storeOwnerId}/${patient_id}/${timestamp}-p${i}.jpg`;
    const { error: uploadErr } = await supabaseAdmin
      .storage
      .from('prescription-vault')
      .upload(storagePath, compressedBuffer, { contentType: 'image/jpeg', upsert: false });

    if (uploadErr) {
      if (uploadedPaths.length > 0) {
        await supabaseAdmin.storage.from('prescription-vault').remove(uploadedPaths);
      }
      return res.status(500).json({ error: `Page ${i + 1} upload failed: ` + uploadErr.message });
    }

    uploadedPaths.push(storagePath);
  }

  // ── Insert record ─────────────────────────────────────────────
  const firstPath = uploadedPaths.length > 0 ? uploadedPaths[0] : null;
  const { data: record, error: insertErr } = await supabaseAdmin
    .from('vault_prescription_records')
    .insert({
      patient_id,
      image_path: firstPath,          // null for text-only records
      record_date,
      notes: hasNotes ? notes.trim() : null,
    })
    .select('id, image_path, record_date, uploaded_at, notes')
    .single();

  if (insertErr) {
    if (uploadedPaths.length > 0) {
      await supabaseAdmin.storage.from('prescription-vault').remove(uploadedPaths);
    }
    return res.status(500).json({ error: 'Failed to save record: ' + insertErr.message });
  }

  // ── Insert pages into vault_record_images ─────────────────────
  if (uploadedPaths.length > 0) {
    const imageRows = uploadedPaths.map((storagePath, index) => ({
      record_id: record.id,
      image_path: storagePath,
      page_order: index,
    }));

    const { error: imgInsertErr } = await supabaseAdmin
      .from('vault_record_images')
      .insert(imageRows);

    if (imgInsertErr) {
      console.error('[vault/upload] Failed to insert into vault_record_images:', imgInsertErr.message);
    }
  }

  // Generate signed URLs to return a fully shaped record object
  let images = [];
  if (uploadedPaths.length > 0) {
    const { data: signed } = await supabaseAdmin
      .storage.from('prescription-vault')
      .createSignedUrls(uploadedPaths, 900);
    images = (signed || []).map((s, index) => ({
      image_path: uploadedPaths[index],
      signedUrl: s.signedUrl || null,
      page_order: index,
    }));
  }

  const returnedRecord = {
    ...record,
    signedUrl: images.length > 0 ? images[0].signedUrl : null,
    images,
  };

  return res.status(201).json({ record: returnedRecord });
}
