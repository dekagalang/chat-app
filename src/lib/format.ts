/**
 * Formatting utilities
 */

export function formatCurrency(price: number | string): string {
  let numPrice: number;

  if (typeof price === "string") {
    numPrice = parseInt(price.replace(/[^\d]/g, ""), 10);
  } else {
    numPrice = price;
  }

  if (isNaN(numPrice)) {
    return String(price);
  }

  return `Rp ${numPrice.toLocaleString("id-ID")}`;
}
