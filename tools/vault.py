"""Encrypt/decrypt the private job list for kantimohanthy.com.

Usage (password comes from the JOBS_PASSWORD environment variable, never from a file in this repo):
  python3 tools/vault.py lock   jobs.json      jobs.enc.json
  python3 tools/vault.py unlock jobs.enc.json  jobs.json

Format: AES-256-GCM, key from PBKDF2-HMAC-SHA256 (600,000 iterations, 16-byte random salt), 12-byte random IV.
The page decrypts it in the browser with WebCrypto. Never commit the plaintext jobs.json.
"""
import base64, json, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 600_000

def key(pw: str, salt: bytes) -> bytes:
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(pw.encode())

def main():
    mode, src, dst = sys.argv[1:4]
    pw = os.environ.get("JOBS_PASSWORD")
    if not pw:
        sys.exit("Set JOBS_PASSWORD")
    if mode == "lock":
        data = open(src, "rb").read()
        json.loads(data)  # refuse to encrypt invalid JSON
        salt, iv = os.urandom(16), os.urandom(12)
        ct = AESGCM(key(pw, salt)).encrypt(iv, data, None)
        b = lambda x: base64.b64encode(x).decode()
        json.dump({"v": 1, "kdf": "PBKDF2-SHA256", "iter": ITER, "salt": b(salt), "iv": b(iv), "ct": b(ct)}, open(dst, "w"))
    elif mode == "unlock":
        e = json.load(open(src))
        d = lambda x: base64.b64decode(x)
        data = AESGCM(key(pw, d(e["salt"]))).decrypt(d(e["iv"]), d(e["ct"]), None)
        open(dst, "wb").write(data)
    else:
        sys.exit("mode must be lock or unlock")

if __name__ == "__main__":
    main()
