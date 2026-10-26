"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validCBEReceiptId = void 0;
exports.parseCBETransaction = parseCBETransaction;
exports.verifyCBEReceiptId = verifyCBEReceiptId;
const axios_1 = __importDefault(require("axios"));
const validCBEReceiptId = (value) => typeof value === 'string' && /^(?:v2-)?[A-Za-z0-9]{16,80}$/.test(value);
exports.validCBEReceiptId = validCBEReceiptId;
/** Field names and public app headers come from CBE's receipt viewer. */
function parseCBETransaction(data) {
    const amountText = String(data?.amountCredited ?? '');
    const amount = /^\d+(?:\.\d+)?$/.test(amountText) ? Number(amountText) : NaN;
    const reference = data?.id;
    if (!/^FT[A-Z0-9]{6,40}$/.test(reference || '') ||
        typeof data?.debitAccountHolder !== 'string' || !data.debitAccountHolder.trim() ||
        typeof data?.creditAccountHolder !== 'string' || !data.creditAccountHolder.trim() ||
        !Number.isFinite(amount) || amount <= 0 ||
        !/^[A-Z]{3}$/.test(data?.creditCurrency || '')) {
        return { success: false, error: 'CBE returned an incomplete or unreadable receipt.' };
    }
    const status = typeof data.status === 'string' ? data.status.toUpperCase() : '';
    const success = ['COMPLETED', 'SUCCESS', 'SUCCESSFUL', 'SETTLED', 'PAID'].includes(status);
    const dateValue = Array.isArray(data.dateTimes) ? data.dateTimes[0] : undefined;
    const date = typeof dateValue === 'string' && Number.isFinite(Date.parse(dateValue))
        ? new Date(dateValue) : undefined;
    return {
        success, reference, amount, currency: data.creditCurrency, status: status || 'Unknown',
        payer: data.debitAccountHolder.trim(), receiver: data.creditAccountHolder.trim(),
        payerAccount: data.debitAccountNo, receiverAccount: data.creditAccountNo, date,
        ...(success ? {} : { error: 'CBE has not reported this payment as completed.' })
    };
}
async function verifyCBEReceiptId(receiptId) {
    if (!(0, exports.validCBEReceiptId)(receiptId))
        return { success: false, error: 'Invalid CBE receipt ID.' };
    try {
        const response = await axios_1.default.get('https://mb.cbe.com.et/api/v1/transactions/public/transaction-detail/' + encodeURIComponent(receiptId), {
            headers: {
                Accept: 'application/json',
                'X-App-ID': process.env.CBE_APP_ID || 'd1292e42-7400-49de-a2d3-9731caa4c819',
                'X-App-Version': process.env.CBE_APP_VERSION || '0a01980b-9859-1369-8198-59f403820000'
            },
            timeout: 30000, maxRedirects: 0, maxContentLength: 1024 * 1024
        });
        return parseCBETransaction(response.data);
    }
    catch {
        return { success: false, error: 'The CBE receipt could not be retrieved. No payment was confirmed. Try again later.' };
    }
}
