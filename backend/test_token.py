#!/usr/bin/env python3
"""Test script to debug PDF export token validation"""

import base64
import json
from datetime import datetime

# Token from the error log
token = "eyJyZXF1ZXN0ZXJfaWQiOiAiMSIsICJ0YXJnZXRfdXNlcl9pZCI6ICIxIiwgInN0YXJ0X2RhdGUiOiAiMjAyNi0wMS0wMSIsICJlbmRfZGF0ZSI6ICIyMDI2LTAxLTMxIiwgInByaW1hcnlfY29sb3IiOiAiI2UwNWQzOCJ9:1vewvM:oYF20Dt4dO9n07N9UGksGEAo7P5S2LOXVq0pYz1imLE"

print("Token structure analysis:")
print(f"Full token: {token}\n")

# Split by ':'
parts = token.split(':')
print(f"Number of parts (should be 3 for TimestampSigner): {len(parts)}")
print(f"Part 1 (base64 payload): {parts[0]}")
print(f"Part 2 (timestamp): {parts[1] if len(parts) > 1 else 'N/A'}")
print(f"Part 3 (signature): {parts[2] if len(parts) > 2 else 'N/A'}")

# Try to decode the base64 payload
try:
    decoded_payload = base64.urlsafe_b64decode(parts[0]).decode()
    print(f"\nDecoded payload: {decoded_payload}")
    
    # Try to parse as JSON
    data = json.loads(decoded_payload)
    print(f"\nParsed JSON data:")
    for key, value in data.items():
        print(f"  {key}: {value}")
except Exception as e:
    print(f"\nError decoding: {e}")

print("\n" + "="*60)
print("This token needs to be validated with Django's TimestampSigner")
print("The SECRET_KEY must match between signing and validation")
print("="*60)
