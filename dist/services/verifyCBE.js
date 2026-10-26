"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCBE = verifyCBE;
const axios_1 = __importDefault(require("axios"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const https_1 = __importDefault(require("https"));
const logger_1 = __importDefault(require("../utils/logger"));
function titleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}
async function verifyCBE(reference, accountSuffix) {
    const fullId = `${reference}${accountSuffix}`;
    const url = `https://apps.cbe.com.et:100/?id=${fullId}`;
    const httpsAgent = new https_1.default.Agent({ rejectUnauthorized: true });
    try {
        logger_1.default.info(`🔎 Attempting direct fetch: ${url}`);
        const response = await axios_1.default.get(url, {
            httpsAgent,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/pdf'
            },
            timeout: 30000
        });
        logger_1.default.info('✅ Direct fetch success, parsing PDF');
        return await parseCBEReceipt(response.data);
    }
    catch (directErr) {
        logger_1.default.warn('⚠️ Direct fetch failed, falling back to Puppeteer:', directErr.message);
        return { success: false, error: 'Direct CBE retrieval failed. Please retry or review manually.' };
    }
}

async function parseCBEReceipt(buffer) {
    try {
        const parsed = await (0, pdf_parse_1.default)(Buffer.from(buffer));
        const rawText = parsed.text.replace(/\s+/g, ' ').trim();
        let payerName = rawText.match(/Payer\s*:?\s*(.*?)\s+Account/i)?.[1]?.trim();
        let receiverName = rawText.match(/Receiver\s*:?\s*(.*?)\s+Account/i)?.[1]?.trim();
        const accountMatches = [...rawText.matchAll(/Account\s*:?\s*([A-Z0-9]?\*{4}\d{4})/gi)];
        const payerAccount = accountMatches?.[0]?.[1];
        const receiverAccount = accountMatches?.[1]?.[1];
        const reason = rawText.match(/Reason\s*\/\s*Type of service\s*:?\s*(.*?)\s+Transferred Amount/i)?.[1]?.trim();
        const amountText = rawText.match(/Transferred Amount\s*:?\s*([\d,]+\.\d{2})\s*ETB/i)?.[1];
        const referenceMatch = rawText.match(/Reference No\.?\s*\(VAT Invoice No\)\s*:?\s*([A-Z0-9]+)/i)?.[1]?.trim();
        const dateRaw = rawText.match(/Payment Date & Time\s*:?\s*([\d\/,: ]+[APM]{2})/i)?.[1]?.trim();
        const amount = amountText ? parseFloat(amountText.replace(/,/g, '')) : undefined;
        const date = dateRaw ? new Date(dateRaw) : undefined;
        payerName = payerName ? titleCase(payerName) : undefined;
        receiverName = receiverName ? titleCase(receiverName) : undefined;
        if (payerName && payerAccount && receiverName && receiverAccount && amount && date && referenceMatch) {
            return {
                success: true,
                payer: payerName,
                payerAccount,
                receiver: receiverName,
                receiverAccount,
                amount,
                date,
                reference: referenceMatch,
                reason: reason || null
            };
        }
        else {
            return {
                success: false,
                error: 'Could not extract all required fields from PDF.'
            };
        }
    }
    catch (parseErr) {
        logger_1.default.error('❌ PDF parsing failed:', parseErr.message);
        return { success: false, error: 'Error parsing PDF data' };
    }
}
