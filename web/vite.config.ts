import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The browser only talks to its own origin; Vite forwards API and file requests.
// `xfwd` appends the browser's address to x-forwarded-for, so an API started with
// TRUST_PROXY=1 can rate-limit each browser separately (docs/reference/configuration.md).
const api = process.env.SUBMISSION_WIZARD_API_URL ?? 'http://localhost:4400';
const proxy = {
  '/graphql': { target: api, xfwd: true },
  '/manuscripts': { target: api, xfwd: true },
};

// Headers for the app's own pages and assets. Proxied API responses keep the API's headers.
const baseHeaders = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

// The production build has no inline scripts or styles, so everything comes from 'self'.
// React's `style` prop writes through the CSSOM, which style-src does not restrict.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export default defineConfig({
  plugins: [react()],
  // The dev server sends no CSP: React Fast Refresh injects an inline script.
  server: { proxy, headers: baseHeaders },
  preview: { proxy, headers: { ...baseHeaders, 'content-security-policy': contentSecurityPolicy } },
  // Small fonts are emitted as files rather than data: URLs, so font-src can stay 'self'.
  // No source maps: the production build does not publish its sources.
  build: { sourcemap: false, assetsInlineLimit: 0 },
});
