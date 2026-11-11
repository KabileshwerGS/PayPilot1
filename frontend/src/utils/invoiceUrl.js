/**
 * Generate a shareable checkout URL for an invoice.
 * If VITE_PUBLIC_URL is configured (e.g., deployed domain or public tunnel), uses that.
 * Otherwise, falls back to the browser's current window.location.origin.
 */
export function getInvoiceShareUrl(invoiceNumber) {
  const envPublicUrl = import.meta.env.VITE_PUBLIC_URL || import.meta.env.VITE_FRONTEND_URL;
  const base = envPublicUrl ? envPublicUrl.replace(/\/+$/, '') : window.location.origin;
  return `${base}/pay/${invoiceNumber}`;
}

