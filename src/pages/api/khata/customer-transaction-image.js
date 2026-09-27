// src/pages/api/khata/customer-transaction-image.js
// Handles photo attachment uploads, signed URL retrieval, and cleanup for customer credit transactions

import sharp from 'sharp';
import { prisma } from '../../../lib/prisma';
import { getStoreOwnerId } from '../../../lib/khata-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Next.js default body parser can't handle binary — disable it
export const config = { api: { bodyParser: false } };

const BUCKET_NAME = 'customer-transaction-receipts';

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
  const storeOwnerId = await getStoreOwnerId(req, res);
  if (!storeOwnerId) return;

  // ── POST: Upload transaction photo ─────────────────────────────
  if (req.method === 'POST') {
    let uploadedPath = null;
    try {
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

      const { transactionId } = parts;
      const file = Array.isArray(parts.file) ? parts.file[0] : parts.file;

      if (!transactionId || !file) {
        return res.status(400).json({ error: 'transactionId and file are required.' });
      }

      // Verify the transaction belongs to this store
      const txRecord = await prisma.customerTransaction.findFirst({
        where: { id: Number(transactionId), storeOwnerId }
      });
      if (!txRecord) {
        return res.status(403).json({ error: 'Transaction not found or access denied.' });
      }

      // Compress with sharp
      let compressedBuffer;
      try {
        compressedBuffer = await sharp(file.data)
          .rotate()
          .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60 })
          .toBuffer();
      } catch (compErr) {
        console.error('[customer-transaction-image] Compression error:', compErr);
        return res.status(500).json({ error: 'Image compression failed: ' + compErr.message });
      }

      const storagePath = `${storeOwnerId}/${transactionId}-${Date.now()}.jpg`;
      uploadedPath = storagePath;

      const { error: uploadErr } = await supabaseAdmin
        .storage
        .from(BUCKET_NAME)
        .upload(storagePath, compressedBuffer, { contentType: 'image/jpeg', upsert: false });

      if (uploadErr) {
        console.error('[customer-transaction-image] Storage upload error:', uploadErr);
        return res.status(500).json({ error: 'Upload failed: ' + uploadErr.message });
      }

      try {
        await prisma.customerTransaction.update({
          where: { id: Number(transactionId) },
          data: { imagePath: storagePath }
        });
      } catch (dbErr) {
        console.error('[customer-transaction-image] DB update error, cleaning up file:', dbErr);
        if (uploadedPath) {
          await supabaseAdmin.storage.from(BUCKET_NAME).remove([uploadedPath]);
        }
        return res.status(500).json({ error: 'Failed to update transaction with image path: ' + dbErr.message });
      }

      return res.status(200).json({ imagePath: storagePath });
    } catch (err) {
      console.error('[customer-transaction-image] POST error:', err);
      if (uploadedPath) {
        try {
          await supabaseAdmin.storage.from(BUCKET_NAME).remove([uploadedPath]);
        } catch (cleanupErr) {
          console.error('[customer-transaction-image] Cleanup error:', cleanupErr);
        }
      }
      return res.status(500).json({ error: err.message || 'Failed to upload photo.' });
    }
  }

  // ── GET: Get signed URL for transaction photo ──────────────────
  if (req.method === 'GET') {
    try {
      const { transactionId } = req.query;
      if (!transactionId) {
        return res.status(400).json({ error: 'transactionId is required.' });
      }

      const txRecord = await prisma.customerTransaction.findFirst({
        where: { id: Number(transactionId), storeOwnerId }
      });

      if (!txRecord) {
        return res.status(403).json({ error: 'Transaction not found or access denied.' });
      }

      if (!txRecord.imagePath) {
        return res.status(404).json({ error: 'No image found for this transaction.' });
      }

      const { data: signed, error: signErr } = await supabaseAdmin
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(txRecord.imagePath, 900);

      if (signErr || !signed?.signedUrl) {
        return res.status(500).json({ error: 'Failed to generate signed URL: ' + (signErr?.message || 'Unknown error') });
      }

      return res.status(200).json({ signedUrl: signed.signedUrl });
    } catch (err) {
      console.error('[customer-transaction-image] GET error:', err);
      return res.status(500).json({ error: err.message || 'Failed to get image URL.' });
    }
  }

  // ── DELETE: Remove photo from storage and clear DB field ───────
  if (req.method === 'DELETE') {
    try {
      const { transactionId } = req.query;
      if (!transactionId) {
        return res.status(400).json({ error: 'transactionId is required.' });
      }

      const txRecord = await prisma.customerTransaction.findFirst({
        where: { id: Number(transactionId), storeOwnerId }
      });

      if (txRecord && txRecord.imagePath) {
        try {
          await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .remove([txRecord.imagePath]);
        } catch (storageErr) {
          console.error('[customer-transaction-image] Storage delete error:', storageErr);
        }

        try {
          await prisma.customerTransaction.update({
            where: { id: Number(transactionId) },
            data: { imagePath: null }
          });
        } catch (dbErr) {
          console.error('[customer-transaction-image] DB clear error:', dbErr);
        }
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[customer-transaction-image] DELETE error:', err);
      return res.status(200).json({ success: true });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
