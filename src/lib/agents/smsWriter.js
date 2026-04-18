class SMSWriter {
  constructor() {
    this.HEADER_SIZE = 1704
    this.RECORD_SIZE = 499
    this.VERSION_BYTE = 0x30
    this.EOF_MARKER = 0x1A
    this.DELETION_FLAG = 0x20

    this.FIELDS = [
      ['PARTYCODE', 'C', 3, 0], ['NAME', 'C', 40, 0], ['ADD1', 'C', 40, 0],
      ['VOU_NO', 'N', 6, 0], ['VOU_TYPE', 'C', 3, 0], ['TR_DATE', 'D', 8, 0],
      ['DUE_DATE', 'D', 8, 0], ['PROD_CODE', 'C', 10, 0], ['PROD_NAME', 'C', 30, 0],
      ['COMP_NAME', 'C', 30, 0], ['PAK', 'C', 6, 0], ['UOM', 'N', 5, 0],
      ['COMP', 'C', 3, 0], ['QTY', 'N', 7, 0], ['QTY_SCM', 'N', 7, 0],
      ['DISC_SCM', 'N', 6, 2], ['PR_BATCHNO', 'C', 15, 0], ['EXPIRY', 'C', 5, 0],
      ['RATE', 'N', 12, 3], ['MRP', 'N', 12, 2], ['DISCOUNT', 'N', 6, 2],
      ['DISC_AMT', 'N', 12, 2], ['PR_PTR', 'N', 11, 3], ['SPL_DISC', 'N', 8, 2],
      ['SURCHARGE', 'N', 8, 2], ['DISC_PER', 'N', 6, 2], ['CASH_DISC', 'N', 8, 2],
      ['CR_AMT', 'N', 10, 2], ['PTS_PER', 'N', 5, 2], ['PTS_AMT', 'N', 10, 2],
      ['DEBIT', 'N', 12, 2], ['GROS_AMT', 'N', 12, 2], ['CAT_CODE', 'C', 3, 0],
      ['FREIGHT', 'N', 10, 2], ['BAR_CODE', 'C', 50, 0], ['HSNCODE', 'C', 15, 0],
      ['SGST', 'N', 5, 2], ['CGST', 'N', 5, 2], ['IGST', 'N', 5, 2],
      ['SGSTAMT', 'N', 10, 3], ['CGSTAMT', 'N', 10, 3], ['IGSTAMT', 'N', 10, 3],
      ['SHELF_NO', 'C', 10, 0], ['_NullFlags', '0', 1, 0]
    ]
  }

  generate(records, templateBuffer) {
    const header = Buffer.alloc(this.HEADER_SIZE)
    templateBuffer.copy(header, 0, 0, this.HEADER_SIZE)
    header.writeUInt32LE(records.length, 4)
    const body = Buffer.concat(records.map((rec, index) => this._encodeRecord(rec, index)))
    return Buffer.concat([header, body, Buffer.from([this.EOF_MARKER])])
  }

  _encodeRecord(data, index) {
    const buf = Buffer.alloc(this.RECORD_SIZE, 0x20)
    buf[0] = this.DELETION_FLAG
    let offset = 1
    for (const [name, type, len, dec] of this.FIELDS) {
      let val = data[name] !== undefined ? data[name] : ''
      let strVal = ''
      if (type === 'C' || type === 'D') {
        strVal = String(val).substring(0, len).padEnd(len, ' ')
      } else if (type === 'N') {
        const num = parseFloat(String(val).replace(/,/g, '')) || 0
        strVal = num.toFixed(dec).padStart(len, ' ')
      } else if (type === '0') {
        offset += len
        continue
      }
      buf.write(strVal.substring(0, len), offset, len, 'latin1')
      offset += len
    }
    return buf
  }
}

module.exports = new SMSWriter()