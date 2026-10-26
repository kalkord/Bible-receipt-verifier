"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyTelebirr_1 = require("../services/verifyTelebirr");
const logger_1 = __importDefault(require("../utils/logger"));
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    const { reference } = req.body;
    if (!reference) {
        res.status(400).json({ success: false, error: 'Missing reference.' });
        return;
    }
    try {
        const result = await (0, verifyTelebirr_1.verifyTelebirr)(reference);
        if (!result) {
            res.status(404).json({ success: false, error: 'Unable to verify this receipt directly with Telebirr. Check the reference or try again later.' });
            return;
        }
        res.json({ success: true, data: result });
    }
    catch (err) {
        logger_1.default.error('Telebirr verification error:', err);
        res.status(500).json({
            success: false,
            error: 'Server error verifying Telebirr receipt.',
            message: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});
exports.default = router;
