import csv
import struct
from datetime import datetime
import re
import os

class SMSAgent:
    """The Protocol Master: Enforces the .sms (DBF) byte-level structure."""
    
    FIELDS = [
        ('PARTYCODE', 'C', 3, 0), ('NAME', 'C', 40, 0), ('ADD1', 'C', 40, 0),
        ('VOU_NO', 'N', 6, 0), ('VOU_TYPE', 'C', 3, 0), ('TR_DATE', 'D', 8, 0),
        ('DUE_DATE', 'D', 8, 0), ('PROD_CODE', 'C', 10, 0), ('PROD_NAME', 'C', 30, 0),
        ('COMP_NAME', 'C', 30, 0), ('PAK', 'C', 6, 0), ('UOM', 'N', 5, 0),
        ('COMP', 'C', 3, 0), ('QTY', 'N', 7, 0), ('QTY_SCM', 'N', 7, 0),
        ('DISC_SCM', 'N', 6, 2), ('PR_BATCHNO', 'C', 15, 0), ('EXPIRY', 'C', 5, 0),
        ('RATE', 'N', 12, 3), ('MRP', 'N', 12, 2), ('DISCOUNT', 'N', 6, 2),
        ('DISC_AMT', 'N', 12, 2), ('PR_PTR', 'N', 11, 3), ('SPL_DISC', 'N', 8, 2),
        ('SURCHARGE', 'N', 8, 2), ('DISC_PER', 'N', 6, 2), ('CASH_DISC', 'N', 8, 2),
        ('CR_AMT', 'N', 10, 2), ('PTS_PER', 'N', 5, 2), ('PTS_AMT', 'N', 10, 2),
        ('DEBIT', 'N', 12, 2), ('GROS_AMT', 'N', 12, 2), ('CAT_CODE', 'C', 3, 0),
        ('FREIGHT', 'N', 10, 2), ('BAR_CODE', 'C', 50, 0), ('HSNCODE', 'C', 15, 0),
        ('SGST', 'N', 5, 2), ('CGST', 'N', 5, 2), ('IGST', 'N', 5, 2),
        ('SGSTAMT', 'N', 10, 3), ('CGSTAMT', 'N', 10, 3), ('IGSTAMT', 'N', 10, 3),
        ('SHELF_NO', 'C', 10, 0), ('_NullFlags', '0', 1, 0)
    ]

    def __init__(self, template_path):
        with open(template_path, 'rb') as f:
            self.header_template = bytearray(f.read(1704))

    def generate(self, records, output_path):
        header = bytearray(self.header_template)
        struct.pack_into('<L', header, 4, len(records)) # Update record count
        
        with open(output_path, 'wb') as f:
            f.write(header)
            for r in records:
                f.write(b'\x20') # Deletion flag (space means not deleted)
                for name, type, length, dec in self.FIELDS:
                    val = r.get(name, '')
                    if type == 'N':
                        try:
                            f_val = float(str(val).replace(',', ''))
                            # Numeric fields use rjust(length)
                            f.write(f"{f_val:.{dec}f}".rjust(length).encode('ascii')[:length])
                        except: f.write("0.00".rjust(length).encode('ascii')[:length])
                    elif type == 'D':
                        f.write(str(val).ljust(8).encode('ascii')[:8])
                    elif type == '0':
                        f.write(b'\x00')
                    else:
                        # Character fields
                        if name == 'VOU_NO':
                            # Use rjust(6) with spaces as seen in working file
                            f.write(str(val).rjust(6).encode('ascii')[:6])
                        elif name == 'PARTYCODE':
                            f.write(str(val).ljust(3).encode('ascii')[:3])
                        else:
                            f.write(str(val).ljust(length).encode('ascii')[:length])
            f.write(b'\x1A') # EOF Terminator
        return output_path

class CSVAgent:
    """The Mapper: Standardizes CSV data into SMS-ready format."""
    
    def process_patwari(self, reader, party_code, vendor_name):
        standardized_records = []
        for raw_row in reader:
            # Normalize keys to lowercase for robustness
            row = {k.lower(): v for k, v in raw_row.items()}

            if not any(row.values()): continue

            inv_date_raw = row.get('invdate', '').strip()
            tr_date = datetime.now().strftime('%Y%m%d')
            for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%Y-%m-%d', '%Y/%m/%d'):
                try:
                    dt = datetime.strptime(inv_date_raw, fmt)
                    tr_date = dt.strftime('%Y%m%d')
                    break
                except: continue

            exp_date_raw = row.get('expdate', '').strip()
            expiry = "12/30"
            for fmt in ('%d-%m-%Y', '%d/%m/%Y', '%m/%Y', '%m-%Y'):
                try:
                    et = datetime.strptime(exp_date_raw, fmt)
                    expiry = et.strftime('%m/%y')
                    break
                except: continue

            barcode = row.get('barcode', '').strip()
            myitemno = row.get('myitemno', '').strip()
            mcode = row.get('mcode', '').strip()
            prcode = row.get('prcode', '').strip()
            item_id = ""
            if barcode.isdigit() and 4 <= len(barcode) <= 7: item_id = barcode[-5:].zfill(5)
            elif myitemno.isdigit(): item_id = myitemno[-5:].zfill(5)
            elif mcode.isdigit(): item_id = mcode[-5:].zfill(5)
            else:
                found_nums = re.findall(r'\d{3,}', prcode)
                if found_nums: item_id = found_nums[0][-5:].zfill(5)
                else:
                    hsn = row.get('hsncode', '').strip()
                    if hsn.isdigit() and len(hsn) >= 5: item_id = hsn[-5:]
                    else: item_id = re.sub(r'[^0-9A-Z]', '', prcode.upper())[:5].ljust(5)
            if (not item_id or item_id == "00000") and prcode: item_id = prcode[:5].ljust(5)
            prod_code = f"{party_code.ljust(3)}  {item_id[:5]}"

            # DISCOUNTS:
            td_val = row.get('tdper', '0.00').strip()
            cd_val = row.get('cdper', '0.00').strip()
            
            # Smart VOU_NO extraction (e.g., S/888 -> 888)
            raw_vou = row.get('invno', '').strip()
            vou_nums = re.findall(r'\d+', raw_vou)
            inv_no = vou_nums[-1] if vou_nums else "000000"

            std = {
                'PARTYCODE': party_code, 'NAME': vendor_name[:40], 'ADD1': 'PUNE',
                'VOU_NO': inv_no, 'VOU_TYPE': 'CRB',
                'TR_DATE': tr_date, 'DUE_DATE': tr_date, 'PROD_CODE': prod_code,
                'PROD_NAME': row.get('productdesc', '')[:30],
                'COMP_NAME': row.get('manufacturer', '')[:30], 'PAK': row.get('ppack', '')[:6],
                'UOM': '1', 'COMP': party_code, 'QTY': row.get('qty', '0'),
                'QTY_SCM': row.get('free', '0'), 'PR_BATCHNO': row.get('batchno', '').strip() or 'BATCH001',
                'EXPIRY': expiry, 'RATE': row.get('ptr', '0.000'), 'MRP': row.get('mrp', '0.00'),
                'DISCOUNT': row.get('schper', '0.00'), 'DISC_AMT': row.get('schqtyadjinamt', '0.00'),
                'PR_PTR': row.get('ptr', '0.000'), 'SPL_DISC': '0.00', 'SURCHARGE': '0.00',
                'DISC_PER': td_val, # Trade Discount column
                'CASH_DISC': cd_val, # Cash Discount column
                'HSNCODE': row.get('hsncode', '').strip()[:15], 'SGST': row.get('sgstper', '0.00'),
                'CGST': row.get('cgstper', '0.00'), 'SGSTAMT': row.get('sgstamt', '0.000'),
                'CGSTAMT': row.get('cgstamt', '0.000'), 'BAR_CODE': row.get('barcode', '')
            }
            try:
                qty = float(std['QTY']); rate = float(std['RATE'])
                td_per = float(std['DISC_PER']); cd_per = float(std['CASH_DISC']); sch_amt = float(std['DISC_AMT'])
                gross_before_disc = qty * rate
                
                # Apply Trade Discount first
                td_amt = gross_before_disc * (td_per / 100)
                remaining = gross_before_disc - td_amt
                
                # Apply Cash Discount on the remainder (Standard Pharmacy Math)
                cd_amt = remaining * (cd_per / 100)
                
                gross = remaining - cd_amt - sch_amt
                tax = float(std['SGSTAMT']) + float(std['CGSTAMT'])
                std['GROS_AMT'] = f"{gross:.2f}"; std['DEBIT'] = f"{(gross + tax):.2f}"
            except: pass
            standardized_records.append(std)
        return standardized_records

    def process_anand(self, lines, party_code, vendor_name):
        standardized_records = []
        inv_no = "000000"
        tr_date = datetime.now().strftime('%Y%m%d')
        # Parse header metadata
        for line in lines[:5]:
            if 'Sales Invoice #' in line or 'Invoice # :' in line:
                m = re.search(r'Invoice # : ([\w/]+)', line)
                if m: inv_no = m.group(1)
                d = re.search(r'Date : (\d{2}/\d{2}/\d{2,4})', line)
                if d:
                    for fmt in ('%d/%m/%y', '%d/%m/%Y'):
                        try:
                            dt = datetime.strptime(d.group(1), fmt)
                            tr_date = dt.strftime('%Y%m%d')
                            break
                        except: pass

        # Parse data rows starting from line 6
        import io
        header_line = lines[4].strip()
        data_lines = lines[5:]

        # Use simple split for data to handle empty header columns
        for line in data_lines:
            parts = line.split(',')
            if len(parts) < 10: continue

            # Mapping based on: HSN(0),Name(1),Pack(2),Qty(3),Free(4),Rate(5),MRP(6)...
            hsn = parts[0].strip()
            name = parts[1].strip()
            if not name or name.lower() == 'product name': continue

            # EXPIRY: 01/2027 -> 01/27
            expiry = "12/30"
            exp_raw = parts[18].strip() if len(parts) > 18 else ""
            for fmt in ('%d/%m/%Y', '%m/%Y', '%d/%m/%y', '%m/%y'):
                try:
                    dt = datetime.strptime(exp_raw, fmt)
                    expiry = dt.strftime('%m/%y')
                    break
                except: continue

            item_id = hsn[-5:].zfill(5) if hsn.isdigit() and len(hsn) >= 5 else str(abs(hash(name)) % 100000).zfill(5)
            prod_code = f"{party_code.ljust(3)}  {item_id}"

            std = {
                'PARTYCODE': party_code, 'NAME': vendor_name[:40], 'ADD1': 'PUNE',
                'VOU_NO': inv_no, 'VOU_TYPE': 'CRB', 'TR_DATE': tr_date, 'DUE_DATE': tr_date,
                'PROD_CODE': prod_code, 'PROD_NAME': name[:30],
                'COMP_NAME': 'ANAND', 'PAK': parts[2][:6],
                'UOM': '1', 'COMP': party_code, 
                'QTY': parts[3].strip() or '0',
                'QTY_SCM': parts[4].strip() or '0', # Column 5 (index 4) is Free
                'PR_BATCHNO': (parts[17].strip() if len(parts) > 17 else "") or 'BATCH001',
                'EXPIRY': expiry, 
                'RATE': parts[5].strip() or '0.000',
                'MRP': parts[6].strip() or '0.00',
                'DISCOUNT': parts[11].strip() if len(parts) > 11 else '0.00', # Sch%
                'DISC_AMT': parts[13].strip() if len(parts) > 13 else '0.00', # SchAmt
                'PR_PTR': parts[5].strip() or '0.000',
                'SPL_DISC': '0.00', 'SURCHARGE': '0.00',
                'DISC_PER': parts[12].strip() if len(parts) > 12 else '0.00', # TD%
                'CASH_DISC': '0.00',
                'HSNCODE': hsn[:15], 
                'SGST': parts[9].strip() if len(parts) > 9 else '0.00',
                'CGST': parts[7].strip() if len(parts) > 7 else '0.00',
                'SGSTAMT': parts[10].strip() if len(parts) > 10 else '0.000',
                'CGSTAMT': parts[8].strip() if len(parts) > 8 else '0.000',
                'BAR_CODE': ''
            }
            try:
                qty = float(std['QTY']); rate = float(std['RATE']); td_per = float(std['DISC_PER']); sch_amt = float(std['DISC_AMT'])
                gross_before_disc = qty * rate; td_amt = gross_before_disc * (td_per / 100)
                gross = gross_before_disc - td_amt - sch_amt
                tax = float(std['SGSTAMT']) + float(std['CGSTAMT'])
                std['GROS_AMT'] = f"{gross:.2f}"; std['DEBIT'] = f"{(gross + tax):.2f}"
            except: pass
            standardized_records.append(std)
        return standardized_records

    def process(self, csv_path, party_code, vendor_name):
        with open(csv_path, 'r', encoding='utf-8') as f:
            first_line = f.readline()
            f.seek(0)
            if 'ANAND MEDICO' in first_line:
                lines = f.readlines()
                return self.process_anand(lines, 'ANM', 'ANAND MEDICO')
            else:
                # Normal Patwari-like CSV
                reader = csv.DictReader(f)
                return self.process_patwari(reader, party_code, vendor_name)


class PDFAgent:
    """The Extractor: Handles PDF data (manual or OCR)."""
    def process_manual(self, data, party_code, vendor_name):
        """Standardizes manually extracted data."""
        standardized_records = []
        for item in data:
            # 1. Date: 31-Mar-2026 -> 20260331
            try:
                dt = datetime.strptime(item['date'], '%d-%b-%Y')
                tr_date = dt.strftime('%Y%m%d')
            except: tr_date = datetime.now().strftime('%Y%m%d')

            # 2. PROD_CODE: CGM  80866726
            item_id = str(item['pcode']).strip()
            prod_code = f"{party_code.ljust(3)}  {item_id[-5:].zfill(5)}"

            std = {
                'PARTYCODE': party_code, 'NAME': vendor_name[:40], 'ADD1': 'PUNE',
                'VOU_NO': str(item['inv_no'])[-6:], 'VOU_TYPE': 'CRB',
                'TR_DATE': tr_date, 'DUE_DATE': tr_date,
                'PROD_CODE': prod_code, 'PROD_NAME': item['name'][:30],
                'COMP_NAME': 'C G MARKETING', 'PAK': item.get('pack', '')[:6],
                'UOM': '1', 'COMP': party_code, 'QTY': str(item['qty']),
                'QTY_SCM': str(item.get('free', 0)), 'PR_BATCHNO': item.get('batch', 'BATCH001'),
                'EXPIRY': item.get('expiry', '12/30'), 'RATE': str(item['rate']),
                'MRP': str(item['mrp']), 'DISCOUNT': str(item.get('sch_per', 0)),
                'DISC_AMT': str(item.get('sch_amt', 0)), 'PR_PTR': str(item['rate']),
                'SPL_DISC': '0.00', 'SURCHARGE': '0.00', 'DISC_PER': str(item.get('td_per', 0)),
                'CASH_DISC': '0.00', 'HSNCODE': str(item.get('hsn', '')),
                'SGST': str(item.get('gst', 0)), 'CGST': str(item.get('gst', 0)),
                'SGSTAMT': str(item.get('gst_amt', 0)), 'CGSTAMT': str(item.get('gst_amt', 0)),
                'BAR_CODE': ''
            }
            # Gross/Debit
            try:
                qty = float(std['QTY']); rate = float(std['RATE']); td_per = float(std['DISC_PER']); sch_amt = float(std['DISC_AMT'])
                gross = (qty * rate) - ((qty * rate) * (td_per / 100)) - sch_amt
                tax = float(std['SGSTAMT']) + float(std['CGSTAMT'])
                std['GROS_AMT'] = f"{gross:.2f}"; std['DEBIT'] = f"{(gross + tax):.2f}"
            except: pass
            standardized_records.append(std)
        return standardized_records

if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description='MediClan Conversion Engine')
    parser.add_argument('--input', help='Path to the uploaded CSV or PDF')
    parser.add_argument('--code', help='Wholesaler Party Code (e.g., PWP, ANM, PMA, CGM)')
    parser.add_argument('--name', help='Full Vendor Name')
    parser.add_argument('--output', help='Where to save the .sms file')
    parser.add_argument('--pdf-manual', action='store_true', help='Use manual data for the CG Marketing PDF')
    parser.add_argument('--watch', action='store_true', help='Watch the Uploads folder for new files')

    args = parser.parse_args()
    
    template_sms = 'C:/temp/RATADEH_MMPCRB154288.sms'
    mapper = CSVAgent()
    protocol = SMSAgent(template_sms)

    # 1. Handle Manual PDF Mode (The CG Marketing Scan)
    if args.pdf_manual:
        # ... rest of the code ...
        inv_no = "1027832"; date = "31-Mar-2026"
        cgm_data = [
            {'inv_no': inv_no, 'date': date, 'pcode': '80866726', 'name': 'Foam (Reg) 50gm', 'mrp': 95.00, 'qty': 2, 'rate': 71.89, 'gst': 9.0, 'gst_amt': 12.94, 'hsn': '33071090'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80876082', 'name': 'Mach 3 Cart 2s', 'mrp': 349.00, 'qty': 2, 'rate': 264.07, 'gst': 9.0, 'gst_amt': 47.53, 'hsn': '82122011'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80887277', 'name': 'whspr Soft XL+ 15s', 'mrp': 195.00, 'qty': 3, 'rate': 175.67, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80887532', 'name': 'whspr Ult ON XXL 7s', 'mrp': 115.00, 'qty': 3, 'rate': 100.88, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80887674', 'name': 'whspr Ult XXXL ON 4s', 'mrp': 150.00, 'qty': 3, 'rate': 131.58, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80870357', 'name': 'Whspr ON Koala Pants M-L 6s', 'mrp': 299.00, 'qty': 3, 'rate': 232.32, 'sch_amt': 104.55, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80870358', 'name': 'Whspr ON Koala Pants L-XL 6s', 'mrp': 325.00, 'qty': 3, 'rate': 252.53, 'sch_amt': 113.64, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80870356', 'name': 'Whspr ON Koala Pants L-XL 2s', 'mrp': 99.00, 'qty': 4, 'rate': 76.92, 'sch_amt': 46.15, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80848616', 'name': 'whspr Choice Ultr 10s', 'mrp': 70.00, 'qty': 12, 'rate': 63.06, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80845177', 'name': 'whspr Ch Ultra 6s WS', 'mrp': 3200.00, 'qty': 1, 'rate': 2594.67, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80869896', 'name': 'whspr Choice ON XXL 6s', 'mrp': 55.00, 'qty': 6, 'rate': 49.55, 'sch_amt': 14.86, 'hsn': '96190010'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80887987', 'name': 'Pampers RED Pants Jumbo New SM 60s', 'mrp': 560.00, 'qty': 1, 'rate': 444.45, 'sch_amt': 66.67, 'gst': 2.5, 'gst_amt': 9.44, 'hsn': '96190030'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80887985', 'name': 'RED Pants Jumbo New MD 48s', 'mrp': 560.00, 'qty': 2, 'rate': 444.45, 'sch_amt': 133.34, 'gst': 2.5, 'gst_amt': 18.89, 'hsn': '96190030'},
            {'inv_no': inv_no, 'date': date, 'pcode': '80895439', 'name': 'Pampers Active Baby NB 72s Jumbo', 'mrp': 1120.00, 'qty': 1, 'rate': 927.54, 'gst': 2.5, 'gst_amt': 23.19, 'hsn': '96190030'}
        ]
        pdf_agent = PDFAgent()
        records = pdf_agent.process_manual(cgm_data, 'CGM', 'C G MARKETING PVT LTD')
        output = args.output if args.output else 'C:/temp/Results/RATADEH_CGMCRB027832.sms'
        protocol.generate(records, output)
        print(f"Success: {output} generated.")
        sys.exit(0)

    # 2. Handle Website Upload Mode
    if args.input and args.code and args.name:
        print(f"Web Engine: Processing {args.input}...")
        records = mapper.process(args.input, args.code, args.name)
        output = args.output if args.output else f"C:/temp/Results/CONVERTED_{args.code}.sms"
        protocol.generate(records, output)
        
        # Generate JSON summary for the website
        import json
        summary = {
            'vendor': args.name,
            'items': len(records),
            'net_amt': sum(float(r.get('DEBIT', 0)) for r in records),
            'inv_no': records[0]['VOU_NO'] if records else "0"
        }
        with open(output.replace('.sms', '.json'), 'w') as jf:
            json.dump(summary, jf)
            
        print(f"Success: {output} and JSON summary generated.")
        sys.exit(0)

    # 4. Watch Mode (The "Hands-Free" Integration)
    if '--watch' in sys.argv:
        import time
        import json
        print("MediClan Engine is WATCHING C:/temp/Uploads/...")
        print("Press Ctrl+C to stop.")
        
        processed_files = set()
        
        while True:
            uploads = os.listdir('C:/temp/Uploads')
            for f_name in uploads:
                if f_name not in processed_files:
                    path = os.path.join('C:/temp/Uploads', f_name)
                    print(f"New file detected: {f_name}")
                    
                    # Auto-detect Distributor from filename or content
                    code = 'PWP'; name = 'PATWARI PHARMA PVT LTD'
                    if 'anand' in f_name.upper() or 'SINV' in f_name.upper():
                        code = 'ANM'; name = 'ANAND MEDICO'
                    elif 'MEDICA' in f_name.upper():
                        code = 'PMA'; name = 'PREM AGENCY'
                    
                    try:
                        records = mapper.process(path, code, name)
                        out_name = f_name.rsplit('.', 1)[0] + ".sms"
                        output = os.path.join('C:/temp/Results', out_name)
                        protocol.generate(records, output)
                        
                        # JSON Summary
                        summary = {
                            'vendor': name, 'items': len(records),
                            'net_amt': round(sum(float(r.get('DEBIT', 0)) for r in records), 2),
                            'inv_no': records[0]['VOU_NO'] if records else "0"
                        }
                        with open(output.replace('.sms', '.json'), 'w') as jf:
                            json.dump(summary, jf)
                            
                        print(f"Converted {f_name} -> {out_name}")
                    except Exception as e:
                        print(f"Error processing {f_name}: {e}")
                        
                    processed_files.add(f_name)
            time.sleep(2)

    # 3. Default Batch Mode (For testing)
    files_to_process = [
        ('C:/temp/306538_26_I_2600073003710.csv', 'PWP', 'PATWARI PHARMA PVT LTD', 'C:/temp/RATADEH_PWPCRB003710.sms'),
        ('C:/temp/SINV_336-04 04 26_RATAN_STORESDH.csv', 'ANM', 'ANAND MEDICO', 'C:/temp/RATADEH_ANMCRB000336.sms'),
        ('C:/temp/306538_26_I_2600073004561.csv', 'PWP', 'PATWARI PHARMA PVT LTD', 'C:/temp/RATADEH_PWPCRB004561.sms'),
        ('C:/temp/M_Medica_115-S888-07042026.CSV', 'PMA', 'PREM AGENCY', 'C:/temp/RATADEH_PMACRB000888.sms')
    ]
    
    for csv_input, code, name, output_sms in files_to_process:
        if os.path.exists(csv_input):
            records = mapper.process(csv_input, code, name)
            protocol.generate(records, output_sms)
            print(f"Batch Success: {output_sms}")
