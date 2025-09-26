export async function hash(input: string): Promise<string> {
  // Encode string to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // SHA-256 digest
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert ArrayBuffer -> hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  // Convert hex -> BigInt -> base36
  const base36 = BigInt("0x" + hex).toString(36);

  // Take first 8 characters
  return base36.slice(0, 8);
}