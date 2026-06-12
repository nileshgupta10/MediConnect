// FIX 1 of 3 — smsWriter.js
// BUG: BAR_CODE field was declared as 50 bytes but CARE's DBF schema expects 15 bytes.
// This caused a 35-byte offset drift for EVERY field after BAR_CODE:
// HSNCODE, SGST, CGST, IGST, SGSTAMT, CGSTAMT, IGSTAMT, SHELF_NO were all misread by CARE.
// This single change fixes: data overflow + GST mismatch + HSN mismatch.
// Affects ALL distributors, not just Patwari.
//
// CHANGE: line ['BAR_CODE', 'C', 50, 0, true]  →  ['BAR_CODE', 'C', 15, 0, true]

class SMSWriter {
  constructor() {
    this.HEADER_SIZE = 1704
    this.RECORD_SIZE = 499
    this.VERSION_BYTE = 0x30
    this.EOF_MARKER = 0x1A
    this.DELETION_FLAG = 0x20

    this.FIELDS = [
      ['PARTYCODE', 'C',  3, 0, true],
      ['NAME',      'C', 40, 0, true],
      ['ADD1',      'C', 40, 0, true],
      ['VOU_NO',    'N',  6, 0, true],
      ['VOU_TYPE',  'C',  3, 0, true],
      ['TR_DATE',   'D',  8, 0, true],
      ['DUE_DATE',  'D',  8, 0, true],
      ['PROD_CODE', 'C', 10, 0, true],
      ['PROD_NAME', 'C', 30, 0, true],
      ['COMP_NAME', 'C', 30, 0, true],
      ['PAK',       'C',  6, 0, true],
      ['UOM',       'N',  5, 0, true],
      ['COMP',      'C',  3, 0, true],
      ['QTY',       'N',  7, 0, true],
      ['QTY_SCM',   'N',  7, 0, true],
      ['DISC_SCM',  'N',  6, 2, true],
      ['PR_BATCHNO','C', 15, 0, true],
      ['EXPIRY',    'C',  5, 0, true],
      ['RATE',      'N', 12, 3, true],
      ['MRP',       'N', 12, 2, true],
      ['DISCOUNT',  'N',  6, 2, true],
      ['DISC_AMT',  'N', 12, 2, true],
      ['PR_PTR',    'N', 11, 3, true],
      ['SPL_DISC',  'N',  8, 2, false],
      ['SURCHARGE', 'N',  8, 2, false],
      ['DISC_PER',  'N',  6, 2, true],
      ['CASH_DISC', 'N',  8, 2, false],
      ['CR_AMT',    'N', 10, 2, false],
      ['PTS_PER',   'N',  5, 2, false],
      ['PTS_AMT',   'N', 10, 2, false],
      ['DEBIT',     'N', 12, 2, true],
      ['GROS_AMT',  'N', 12, 2, true],
      ['CAT_CODE',  'C',  3, 0, true],
      ['FREIGHT',   'N', 10, 2, false],
      // ✅ FIX: was 50, must be 15 to match CARE's DBF field descriptor in the template header
      ['BAR_CODE',  'C', 15, 0, true],
      ['HSNCODE',   'C', 15, 0, true],
      ['SGST',      'N',  5, 2, true],
      ['CGST',      'N',  5, 2, true],
      ['IGST',      'N',  5, 2, true],
      ['SGSTAMT',   'N', 10, 3, true],
      ['CGSTAMT',   'N', 10, 3, true],
      ['IGSTAMT',   'N', 10, 3, false],
      ['SHELF_NO',  'C', 10, 0, false],
      ['_NullFlags','0',  1, 0, false],
    ]
  }

  generate(records, templateBuffer) {
    const header = Buffer.alloc(this.HEADER_SIZE)
    templateBuffer.copy(header, 0, 0, this.HEADER_SIZE)
    header.writeUInt32LE(records.length, 4)
    header.writeUInt16LE(this.RECORD_SIZE, 10)
    const body = Buffer.concat(records.map((rec) => this._encodeRecord(rec)))
    return Buffer.concat([header, body, Buffer.from([this.EOF_MARKER])])
  }

  _encodeRecord(data) {
    const buf = Buffer.alloc(this.RECORD_SIZE, 0x20)
    buf[0] = this.DELETION_FLAG
    let offset = 1

    for (const [name, type, len, dec, required] of this.FIELDS) {
      let raw = data[name]

      if (type === '0') {
        buf[offset] = 0x00
        offset += len
        continue
      }

      let strVal

      if (type === 'C' || type === 'D') {
        strVal = String(raw !== undefined && raw !== null ? raw : '').substring(0, len).padEnd(len, ' ')
      } else if (type === 'N') {
        const num = parseFloat(String(raw !== undefined && raw !== null ? raw : '').replace(/,/g, '')) || 0
        if (!required && num === 0) {
          offset += len
          continue
        }
        strVal = num.toFixed(dec).padStart(len, ' ')
      }

      buf.write(strVal.substring(0, len), offset, len, 'latin1')
      offset += len
    }

    return buf
  }
}

module.exports = new SMSWriter()