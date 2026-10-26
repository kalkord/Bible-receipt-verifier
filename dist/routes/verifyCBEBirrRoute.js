"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyCBEBirr_1 = require("../services/verifyCBEBirr");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// Validation helper for Ethiopian phone numbers
function isValidEthiopianPhone(phone) {
    // Ethiopian phone numbers should start with 251 and be 12 digits total
    const phoneRegex = /^251\d{9}$/;
    return phoneRegex.test(phone);
}
// POST endpoint for CBE Birr verification
router.post('/', async (req, res) => {
    try {
        const { receiptNumber, phoneNumber } = req.body;
        const apiKey = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-api-key'];
        // Validate required parameters
        if (!receiptNumber) {
            res.status(400).json({
                success: false,
                error: 'Receipt number is required'
            });
            return;
        }
        if (!phoneNumber) {
            res.status(400).json({
                success: false,
                error: 'Phone number is required'
            });
            return;
        }
        if (!apiKey) {
            res.status(401).json({
                success: false,
                error: 'API key is required in Authorization header or x-api-key header'
            });
            return;
        }
        // Validate Ethiopian phone number format
        if (!isValidEthiopianPhone(phoneNumber)) {
            res.status(400).json({
                success: false,
                error: 'Invalid Ethiopian phone number format. Must start with 251 and be 12 digits total'
            });
            return;
        }
        logger_1.default.info(`[CBEBirr Route] Processing verification request for receipt: ${receiptNumber}, phone: ${phoneNumber}`);
        // Call the verification service
        const result = await (0, verifyCBEBirr_1.verifyCBEBirr)(receiptNumber, phoneNumber);
        // Return the result
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('[CBEBirr Route] Error in POST endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
// GET endpoint for CBE Birr verification (alternative method)
router.get('/', async (req, res) => {
    try {
        const { receiptNumber, phoneNumber } = req.query;
        const apiKey = req.headers.authorization?.replace('Bearer ', '') || req.headers['x-api-key'];
        // Validate required parameters
        if (!receiptNumber || typeof receiptNumber !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Receipt number is required as query parameter'
            });
            return;
        }
        if (!phoneNumber || typeof phoneNumber !== 'string') {
            res.status(400).json({
                success: false,
                error: 'Phone number is required as query parameter'
            });
            return;
        }
        if (!apiKey) {
            res.status(401).json({
                success: false,
                error: 'API key is required in Authorization header or x-api-key header'
            });
            return;
        }
        // Validate Ethiopian phone number format
        if (!isValidEthiopianPhone(phoneNumber)) {
            res.status(400).json({
                success: false,
                error: 'Invalid Ethiopian phone number format. Must start with 251 and be 12 digits total'
            });
            return;
        }
        logger_1.default.info(`[CBEBirr Route] Processing GET verification request for receipt: ${receiptNumber}, phone: ${phoneNumber}`);
        // Call the verification service
        const result = await (0, verifyCBEBirr_1.verifyCBEBirr)(receiptNumber, phoneNumber);
        // Return the result
        res.json(result);
    }
    catch (error) {
        logger_1.default.error('[CBEBirr Route] Error in GET endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});
exports.default = router;
