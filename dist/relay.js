"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMacRelay = createMacRelay;
/** Bank-only tunnel origin. No database, account routes, cookies, or admin operations. */
const express_1 = __importDefault(require("express"));
const node_crypto_1 = require("node:crypto");
const verifyCBERoute_1 = __importDefault(require("./routes/verifyCBERoute"));
const verifyTelebirrRoute_1 = __importDefault(require("./routes/verifyTelebirrRoute"));
const verifyDashenRoute_1 = __importDefault(require("./routes/verifyDashenRoute"));
const verifyAbyssiniaRoute_1 = __importDefault(require("./routes/verifyAbyssiniaRoute"));
const verifyCBEBirrRoute_1 = __importDefault(require("./routes/verifyCBEBirrRoute"));
function createMacRelay(key) {
    if (!key || key.length < 32)
        throw new Error('BANK_RELAY_API_KEY must contain at least 32 characters.');
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
    app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'bank-relay' }));
    app.use((req, res, next) => { const supplied = Buffer.from(typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : ''); const expected = Buffer.from(key); if (supplied.length !== expected.length || !(0, node_crypto_1.timingSafeEqual)(supplied, expected)) {
        res.status(401).json({ error: 'Relay connection key required.' });
        return;
    } next(); });
    const endpoints = ['/verify-cbe', '/verify-telebirr', '/verify-dashen', '/verify-abyssinia', '/verify-cbebirr'];
    let active = 0;
    app.use((req, res, next) => {
        if (!endpoints.includes(req.path)) {
            res.status(404).json({ error: 'Not found.' });
            return;
        }
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Use POST.' });
            return;
        }
        if (Object.keys(req.query).length) {
            res.status(400).json({ error: 'Send receipt details in JSON only.' });
            return;
        }
        if (active >= 2) {
            res.status(429).json({ error: 'The bank verifier is busy. Please retry shortly.' });
            return;
        }
        active++;
        let released = false;
        const release = () => { if (!released) {
            released = true;
            active--;
        } };
        res.once('finish', release);
        res.once('close', release);
        next();
    });
    app.use(express_1.default.json({ limit: '32kb' }));
    app.use('/verify-cbe', verifyCBERoute_1.default);
    app.use('/verify-telebirr', verifyTelebirrRoute_1.default);
    app.use('/verify-dashen', verifyDashenRoute_1.default);
    app.use('/verify-abyssinia', verifyAbyssiniaRoute_1.default);
    app.use('/verify-cbebirr', verifyCBEBirrRoute_1.default);
    const errors = (err, _req, res, _next) => { res.status(err.type === 'entity.too.large' ? 413 : err instanceof SyntaxError ? 400 : 500).json({ error: 'The bank request could not be processed.' }); };
    app.use(errors);
    return app;
}
