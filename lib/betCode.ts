const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateBetCode(length: number = 8): string {
  let result = "";
  const cryptoObj =
    typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto;
  if (cryptoObj && "getRandomValues" in cryptoObj) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += ALPHABET[bytes[i] % ALPHABET.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * ALPHABET.length);
      result += ALPHABET[idx];
    }
  }
  return result;
}

