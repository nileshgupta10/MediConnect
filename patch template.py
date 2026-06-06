#!/usr/bin/env python3
"""
One-time patch: fixes the CARE SMS template file.
Changes BAR_CODE field descriptor from len=50 to len=15,
and updates record_size header field from 499 to 464.

Run once from your project root:
  python3 patch_template.py
"""

import struct, shutil, os, sys

TEMPLATE_PATH = os.path.join('public', 'templates', 'RATADEH_MMPCRB7556.sms')

if not os.path.exists(TEMPLATE_PATH):
    print(f"ERROR: Template not found at {TEMPLATE_PATH}")
    sys.exit(1)

# Backup first
backup = TEMPLATE_PATH + '.backup'
shutil.copy2(TEMPLATE_PATH, backup)
print(f"Backup created: {backup}")

with open(TEMPLATE_PATH, 'rb') as f:
    data = bytearray(f.read())

header_size = struct.unpack_from('<H', data, 8)[0]

# Find BAR_CODE field descriptor and fix len from 50 to 15
offset = 32
found = False
while offset < header_size - 1:
    if data[offset] == 0x0D:
        break
    name = data[offset:offset+11].rstrip(b'\x00').decode('latin1')
    if name.rstrip() == 'BAR_CODE':
        old_len = data[offset + 16]
        data[offset + 16] = 15  # fix length
        print(f"BAR_CODE field: len {old_len} → 15")
        found = True
    offset += 32

if not found:
    print("ERROR: BAR_CODE field not found in template")
    sys.exit(1)

# Fix record_size at header offset 10 (2-byte LE)
old_recsize = struct.unpack_from('<H', data, 10)[0]
struct.pack_into('<H', data, 10, 464)
print(f"Record size: {old_recsize} → 464")

with open(TEMPLATE_PATH, 'wb') as f:
    f.write(data)

print(f"\nTemplate patched successfully: {TEMPLATE_PATH}")
print("You can delete the .backup file once you confirm it works.")