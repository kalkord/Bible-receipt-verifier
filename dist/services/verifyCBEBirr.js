"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCBEBirrReceipt = parseCBEBirrReceipt;
exports.verifyCBEBirr = verifyCBEBirr;
const axios_1 = __importDefault(require("axios"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const logger_1 = __importDefault(require("../utils/logger"));
const clean = (value) => (value || '').replace(/\s+/g, ' ').trim();
/** Read bank PDF text only. Missing fields never become example transaction values. */
function parseCBEBirrReceipt(pdfText) {
    const text = pdfText.replace(/\r\n?/g, '\n');
    if (!/Commercial Bank of Ethiopia/i.test(text) || !/CBEBirr/i.test(text))
        return null;
    const extract = (pattern) => clean(text.match(pattern)?.[1]);
    const debitAccount = extract(/Debit Account\s*([\s\S]*?)(?=\s*Credit Account)/i);
    const creditAccount = extract(/Credit Account\s*([\s\S]*?)(?=\s*Receiver Name)/i);
    const receiverName = extract(/Receiver Name\s*([\s\S]*?)(?=\s*Order ID)/i);
    const orderId = extract(/Order ID\s*:?\s*([A-Z0-9]+)/i);
    const transactionStatus = extract(/Transaction Status\s*:?\s*([\s\S]*?)(?=\s*Reference)/i);
    // Telerik PDF text can concatenate the receipt ID, date, and amount into one line.
    const details = text.split(/Transaction Details/i)[1] || '';
    const row = details.match(/(?:^|\n)\s*([A-Z0-9]{6,40}?)\s*(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s*([\d,]+\.\d{2})(?=\s|$)/);
    if (!row)
        return null;
    const receiptNumber = row[1];
    const transactionDate = clean(row[2]);
    const amount = row[3].replace(/,/g, '');
    const numericAmount = Number(amount);
    const dateParts = transactionDate.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (!dateParts || Number(dateParts[2]) < 1 || Number(dateParts[2]) > 12 || Number(dateParts[3]) < 1 || Number(dateParts[3]) > 31 || Number(dateParts[4]) > 23 || Number(dateParts[5]) > 59)
        return null;
    const customerField = extract(/Customer Name:\s*([^\n:]+)(?=\s*Region:)/i);
    const displacedCustomer = extract(/Sub city:\s*([^:]+?)(?=\s*Wereda\/kebele:)/i);
    const customerName = clean(debitAccount.split(/\s+-\s+/).slice(1).join(' - ')) || customerField || displacedCustomer;
    if (!customerName || !receiverName || !transactionStatus || !Number.isFinite(numericAmount) || numericAmount <= 0)
        return null;
    const financial = details.match(/\n\s*([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+Paid amount/i);
    const financialValue = (label, index) => extract(new RegExp(label + '\\s*:?\\s*([\\d,]+\\.\\d{2})', 'i')).replace(/,/g, '') || (financial?.[index] || '').replace(/,/g, '');
    const paidAmount = financialValue('Paid amount', 1);
    // When both independently printed transfer values are available they must agree.
    if (paidAmount && Number(paidAmount) !== numericAmount)
        return null;
    const payment = text.match(/Payment Channel\s*\n([\s\S]*?)(?=\nThe Bank|\n©|$)/i)?.[1].split('\n').map(clean).filter(Boolean) || [];
    return {
        customerName, debitAccount, creditAccount, receiverName, orderId, transactionStatus,
        reference: extract(/Reference\s*:?\s*([\s\S]*?)(?=\s*Transaction Details)/i),
        receiptNumber, transactionDate, amount, paidAmount,
        serviceCharge: financialValue('Service Charge', 2), vat: financialValue('VAT', 3),
        totalPaidAmount: financialValue('Total Paid Amount', 4),
        paymentReason: payment.length >= 3 ? payment[payment.length - 2] : '',
        paymentChannel: payment.length >= 3 ? payment[payment.length - 1] : '',
    };
}
async function verifyCBEBirr(receiptNumber, phoneNumber) {
    if (!/^[A-Z0-9]{6,40}$/i.test(receiptNumber) || !/^251\d{9}$/.test(phoneNumber))
        return { success: false, error: 'Invalid CBE Birr receipt number or phone number.' };
    const url = new URL('https://cbepay1.cbe.com.et/aureceipt');
    url.searchParams.set('TID', receiptNumber);
    url.searchParams.set('PH', phoneNumber);
    try {
        // The app's API key authenticates our own backend only. Never send it to CBE.
        const response = await axios_1.default.get(url.toString(), {
            responseType: 'arraybuffer', timeout: 40000, maxContentLength: 5 * 1024 * 1024,
            maxRedirects: 0, headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/pdf' },
        });
        const buffer = Buffer.from(response.data);
        if (response.status !== 200 || buffer.subarray(0, 5).toString() !== '%PDF-')
            return { success: false, error: 'CBE Birr did not return a receipt PDF. Check the receipt number and linked phone.' };
        const parsed = parseCBEBirrReceipt((await (0, pdf_parse_1.default)(buffer)).text);
        if (!parsed)
            return { success: false, error: 'The bank receipt could not be read reliably. No payment was confirmed.' };
        if (parsed.receiptNumber.toUpperCase() !== receiptNumber.toUpperCase())
            return { success: false, error: 'The bank returned a different receipt number. No payment was confirmed.' };
        const printedPhones = [parsed.debitAccount, parsed.creditAccount, parsed.receiverName]
            .map(account => account.match(/^((?:\+?251|0)[79]\d{8})(?=\s|$)/)?.[1])
            .filter((phone) => !!phone)
            .map(phone => phone.replace(/^\+/, '').replace(/^0/, '251'));
        if (printedPhones.length && !printedPhones.includes(phoneNumber))
            return { success: false, error: 'The linked phone does not match either receipt party. No payment was confirmed.' };
        logger_1.default.info('[CBEBirr] Bank receipt retrieved and validated');
        return { success: true, exists: true, ...parsed };
    }
    catch (error) {
        const timeout = axios_1.default.isAxiosError(error) && ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code || '');
        logger_1.default.warn('[CBEBirr] Receipt retrieval failed');
        return { success: false, error: timeout ? 'CBE Birr receipt lookup timed out. Please retry.' : 'CBE Birr receipt lookup failed. No payment was confirmed.' };
    }
}
