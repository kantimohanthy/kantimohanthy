#!/usr/bin/env node
// Encrypts/decrypts the private tracker data so only ciphertext lives in this public repo.
// Usage:
//   TRACKER_PASSWORD='...' node tools/tracker-crypt.mjs encrypt private.json masters/data.enc.json
//   TRACKER_PASSWORD='...' node tools/tracker-crypt.mjs decrypt masters/data.enc.json private.json
// Never commit the plaintext JSON. AES-256-GCM, key from PBKDF2-SHA256 (600k iterations).
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const ITERATIONS = 600000;
const [mode, input, output] = process.argv.slice(2);
const password = process.env.TRACKER_PASSWORD;
if (!["encrypt", "decrypt"].includes(mode) || !input || !output || !password) {
  console.error("Usage: TRACKER_PASSWORD=... node tools/tracker-crypt.mjs <encrypt|decrypt> <in> <out>");
  process.exit(1);
}

const b64 = (buf) => Buffer.from(buf).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function deriveKey(salt, iterations) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

if (mode === "encrypt") {
  const plain = readFileSync(input, "utf8");
  JSON.parse(plain); // fail fast on invalid JSON
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(salt, ITERATIONS);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  writeFileSync(output, JSON.stringify({ v: 1, kdf: "PBKDF2-SHA256", iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) }) + "\n");
  console.log(`Encrypted ${input} -> ${output}`);
} else {
  const env = JSON.parse(readFileSync(input, "utf8"));
  const key = await deriveKey(unb64(env.salt), env.iterations);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.ct));
  writeFileSync(output, new TextDecoder().decode(pt));
  console.log(`Decrypted ${input} -> ${output}`);
}
