"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyCBEReceiptId_1 = require("../services/verifyCBEReceiptId");
const verifyCBE_1 = require("../services/verifyCBE");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
router.post('/', async function (req, res) {
    const { reference, accountSuffix, receiptId } = req.body;
    if (receiptId !== undefined) {
        if (!(0, verifyCBEReceiptId_1.validCBEReceiptId)(receiptId)) {
            res.status(400).json({ success: false, error: 'Invalid CBE receipt ID.' });
            return;
        }
        res.json(await (0, verifyCBEReceiptId_1.verifyCBEReceiptId)(receiptId));
        return;
    }
    if (!reference || !accountSuffix) {
        res.status(400).json({ success: false, error: 'Missing reference or accountSuffix.' });
        return;
    }
    try {
        const result = await (0, verifyCBE_1.verifyCBE)(reference, accountSuffix);
        res.json(result);
    }
    catch (err) {
        logger_1.default.error("💥 Payment verification failed:", err);
        res.status(500).json({ success: false, error: 'Server error verifying payment.' });
    }
});
router.get('/', async function (req, res) {
    const { reference, accountSuffix, receiptId } = req.query;
    if (receiptId !== undefined) {
        if (!(0, verifyCBEReceiptId_1.validCBEReceiptId)(receiptId)) {
            res.status(400).json({ success: false, error: 'Invalid CBE receipt ID.' });
            return;
        }
        res.json(await (0, verifyCBEReceiptId_1.verifyCBEReceiptId)(receiptId));
        return;
    }
    if (typeof reference !== 'string' || typeof accountSuffix !== 'string') {
        res.status(400).json({ success: false, error: 'Missing or invalid query parameters.' });
        return;
    }
    try {
        const result = await (0, verifyCBE_1.verifyCBE)(reference, accountSuffix);
        res.json(result);
    }
    catch (err) {
        logger_1.default.error(err);
        res.status(500).json({ success: false, error: 'Server error verifying payment.' });
    }
});
exports.default = router;
