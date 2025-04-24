// backend/utils.js

// hex string → Uint8Array
export function hexToBytes(hex) {
  return Uint8Array.from(Buffer.from(hex.replace(/^0x/, ''), 'hex'));
}

// UTF-8 文本 → Uint8Array
export function utf8ToBytes(text) {
  return new TextEncoder().encode(text);
}
