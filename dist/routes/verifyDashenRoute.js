"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyDashen_1 = require("../services/verifyDashen");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
// POST /verify-dashen
router.post('/', async function (req, res) {
    const { reference } = req.body;
    if (!reference) {
        res.status(400).json({
            success: false,
            error: 'Transaction reference is required'
        });
        return;
    }
    try {
        logger_1.default.info(`🔍 Verifying Dashen transaction: ${reference}`);
        const result = await (0, verifyDashen_1.verifyDashen)(reference);
        if (result.success) {
            logger_1.default.info(`✅ Dashen verification successful for: ${reference}`);
        }
        else {
            logger_1.default.warn(`❌ Dashen verification failed for: ${reference} - ${result.error}`);
        }
        res.json(result);
    }
    catch (error) {
        logger_1.default.error(`💥 Dashen verification error for ${reference}:`, error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error during verification'
        });
    }
});
// GET /verify-dashen (for testing with query parameters)
router.get('/', async function (req, res) {
    const { reference } = req.query;
    if (!reference || typeof reference !== 'string') {
        res.status(400).json({
            success: false,
            error: 'Transaction reference is required as query parameter'
        });
        return;
    }
    try {
        logger_1.default.info(`🔍 Verifying Dashen transaction (GET): ${reference}`);
        const result = await (0, verifyDashen_1.verifyDashen)(reference);
        if (result.success) {
            logger_1.default.info(`✅ Dashen verification successful for: ${reference}`);
        }
        else {
            logger_1.default.warn(`❌ Dashen verification failed for: ${reference} - ${result.error}`);
        }
        res.json(result);
    }
    catch (error) {
        logger_1.default.error(`💥 Dashen verification error for ${reference}:`, error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error during verification'
        });
    }
});
exports.default = router;
