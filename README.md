# AletCloud connectivity test

Upload package.json and server.cjs to the root of a dedicated GitHub repository.
Select the repository in AletCloud Apps. Start command: npm start. No build step
or dependencies are required. The server uses the platform PORT variable, falling
back to 3000. Choose free Solo if available.

Open the deployed URL after 10 seconds. It shows TCP connectivity to the two fixed
bank destinations, tested once at startup. This does not fetch receipts, prove
HTTPS works, or confirm payment verification. Real receipt checks follow only
after this network test. No credentials or receipt data belong in this repository.
