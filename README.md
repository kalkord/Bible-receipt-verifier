# AletCloud bank backend

Bank-only API derived from the local receipt-verifier backend. Accounts and payment
records remain on the existing host. Original MIT copyright is in LICENSE.

Replace the connectivity-test repository contents with the contents of this folder,
including dist and LICENSE. Keep package.json and server.cjs at the repository root.
Remove the old connectivity-test server. Never upload the whole workspace or .env files.

In AletCloud Variables, create BANK_RELAY_API_KEY with a random secret of at least
32 characters (for example, generate one locally with openssl rand -hex 32).
Do not commit the secret or put it in a mobile app. Redeploy with Node 24+, npm start,
and no build command. Dependencies install with npm install. Keep the free Solo plan.

GET /health is public. Receipt routes require POST, JSON and x-api-key matching
BANK_RELAY_API_KEY. No account or administration endpoints are exposed.

POST /verify-telebirr: {"reference":"YOUR_REFERENCE"}
POST /verify-cbe: {"reference":"YOUR_FT_REFERENCE","accountSuffix":"LAST_8_DIGITS"}
POST /verify-cbe: {"receiptId":"YOUR_CBE_MOBILE_RECEIPT_ID"}
Other existing routes: /verify-dashen, /verify-abyssinia, /verify-cbebirr.

This package suppresses bank-service logs containing receipt data, validates TLS
certificates, and uses direct CBE retrieval without a browser fallback. If CBE's
certificate fails validation, fix the trust configuration; do not disable TLS
verification. A successful TCP probe does not prove receipt retrieval works.

After deployment, test real receipts you control using a local terminal or trusted
backend. Do not put keys or receipt details in URLs or public screenshots. Never
interpret HTTP 200 alone as payment confirmation: inspect success and match recipient,
amount, transaction status and reference, then enforce duplicate claims in your
existing application. This service does not credit balances or grant Bible access.

Only after successful real tests, configure the existing production backend with:
BANK_RELAY_URL=https://bible-receipt-verifier.app.aletcloud.com
BANK_RELAY_API_KEY=<the same secret configured in AletCloud>
These are separate from VERIFIER_API_KEY. The existing deployed backend must include
the relay-forwarding support in verifier-backend/src/production.ts before enabling.
