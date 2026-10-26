"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyAbyssinia_1 = require("../services/verifyAbyssinia");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
/**
 * POST /verify-abyssinia
 * Verify Abyssinia bank transaction
 * Body: { reference: string, suffix: string }
 */
router.post('/', async (req, res) => {
    try {
        const { reference, suffix } = req.body;
        // Validate required parameters
        if (!reference || !suffix) {
            logger_1.default.warn('❌ Missing required parameters for Abyssinia verification');
            res.status(400).json({
                success: false,
                error: 'Missing required parameters: reference and suffix are required'
            });
            return;
        }
        // Validate parameter types
        if (typeof reference !== 'string' || typeof suffix !== 'string') {
            logger_1.default.warn('❌ Invalid parameter types for Abyssinia verification');
            res.status(400).json({
                success: false,
                error: 'Invalid parameter types: reference and suffix must be strings'
            });
            return;
        }
        // Validate suffix length (should be 5 digits)
        if (suffix.length !== 5 || !/^\d{5}$/.test(suffix)) {
            logger_1.default.warn(`❌ Invalid suffix format: ${suffix}`);
            res.status(400).json({
                success: false,
                error: 'Invalid suffix: must be exactly 5 digits'
            });
            return;
        }
        logger_1.default.info(`🏦 Processing Abyssinia verification request - Reference: ${reference}, Suffix: ${suffix}`);
        // Call the verification service
        const result = await (0, verifyAbyssinia_1.verifyAbyssinia)(reference, suffix);
        if (result.success) {
            logger_1.default.info(`✅ Abyssinia verification successful for reference: ${reference}`);
            res.json({
                success: true,
                data: result
            });
        }
        else {
            logger_1.default.warn(`❌ Abyssinia verification failed for reference: ${reference}`);
            res.status(404).json({
                success: false,
                error: result.error || 'Transaction not found or verification failed'
            });
        }
    }
    catch (error) {
        logger_1.default.error('❌ Error in Abyssinia verification route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during verification'
        });
    }
});
/**
 * GET /verify-abyssinia
 * Verify Abyssinia bank transaction via query parameters
 * Query: ?reference=string&suffix=string
 */
router.get('/', async (req, res) => {
    try {
        const { reference, suffix } = req.query;
        // Validate required parameters
        if (!reference || !suffix) {
            logger_1.default.warn('❌ Missing required query parameters for Abyssinia verification');
            res.status(400).json({
                success: false,
                error: 'Missing required query parameters: reference and suffix are required'
            });
            return;
        }
        // Validate parameter types
        if (typeof reference !== 'string' || typeof suffix !== 'string') {
            logger_1.default.warn('❌ Invalid query parameter types for Abyssinia verification');
            res.status(400).json({
                success: false,
                error: 'Invalid parameter types: reference and suffix must be strings'
            });
            return;
        }
        // Validate suffix length (should be 5 digits)
        if (suffix.length !== 5 || !/^\d{5}$/.test(suffix)) {
            logger_1.default.warn(`❌ Invalid suffix format: ${suffix}`);
            res.status(400).json({
                success: false,
                error: 'Invalid suffix: must be exactly 5 digits'
            });
            return;
        }
        logger_1.default.info(`🏦 Processing Abyssinia verification request (GET) - Reference: ${reference}, Suffix: ${suffix}`);
        // Call the verification service
        const result = await (0, verifyAbyssinia_1.verifyAbyssinia)(reference, suffix);
        if (result.success) {
            logger_1.default.info(`✅ Abyssinia verification successful for reference: ${reference}`);
            res.json({
                success: true,
                data: result
            });
        }
        else {
            logger_1.default.warn(`❌ Abyssinia verification failed for reference: ${reference}`);
            res.status(404).json({
                success: false,
                error: result.error || 'Transaction not found or verification failed'
            });
        }
    }
    catch (error) {
        logger_1.default.error('❌ Error in Abyssinia verification route (GET):', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during verification'
        });
    }
});
exports.default = router;
