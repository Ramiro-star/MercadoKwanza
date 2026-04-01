/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates a unique 9-digit reference number for Multicaixa payments in Angola.
 * In a real-world scenario, this would involve a checksum (Modulus 97 or similar).
 * For this implementation, we use a combination of timestamp and random digits.
 */
export function generateReferenceNumber(): string {
  const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
  const random = Math.floor(10000 + Math.random() * 90000).toString(); // 5 random digits
  return `${timestamp}${random}`;
}

/**
 * Formats a reference number into groups of 3 for better readability (e.g., 123 456 789).
 */
export function formatReference(ref: string): string {
  return ref.match(/.{1,3}/g)?.join(" ") || ref;
}

/**
 * Mock IBAN generation for Angolan banks (BAI, BFA, BIC, etc.)
 */
export function generateMockIBAN(bankCode: string = "0040"): string {
  const randomPart = Math.floor(Math.random() * 1000000000000000000).toString().padStart(18, "0");
  return `AO06 ${bankCode} ${randomPart.match(/.{1,4}/g)?.join(" ")}`;
}
