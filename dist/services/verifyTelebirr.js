"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeTelebirrReceipt = scrapeTelebirrReceipt;
exports.verifyTelebirr = verifyTelebirr;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const logger_1 = __importDefault(require("../utils/logger"));
/** Read only the amount cell associated with Settled Amount; never scan into fee rows. */
function extractSettledAmount(html) {
    const $ = cheerio.load(html);
    const amountCell = (value) => {
        const text = value.replace(/\s+/g, ' ').trim();
        return /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s+(?:Birr|ETB)$/i.test(text) ? text : '';
    };
    let amount = '';
    $('td, th').each((_, cell) => {
        if (amount || $(cell).find('table').length)
            return;
        const label = $(cell).text().replace(/\s+/g, ' ').trim();
        if (!/(?:^|\/)Settled\s+Amount$/i.test(label))
            return;
        // Some receipts use a label/value row; invoice tables put values on the next row.
        amount = amountCell($(cell).next('td, th').text());
        if (!amount) {
            const row = $(cell).closest('tr');
            const index = row.children('td, th').index(cell);
            amount = amountCell(row.next('tr').children('td, th').eq(index).text());
        }
    });
    return amount;
}
/**
 * Enhanced regex-based extractor for service fee
 * @param htmlContent The raw HTML content
 * @returns Extracted service fee or null
 */
function extractServiceFeeRegex(htmlContent) {
    // Pattern to match "የአገልግሎት ክፍያ/Service fee" followed by amount in Birr
    // Make sure we don't match VAT version
    const pattern = /የአገልግሎት\s+ክፍያ\/Service\s+fee(?!\s+ተ\.እ\.ታ).*?<\/td>\s*<td[^>]*>\s*(\d+(?:\.\d{2})?\s+Birr)/i;
    const match = htmlContent.match(pattern);
    if (match)
        return match[1].trim();
    return null;
}
/**
 * Enhanced regex-based extractor for receipt number
 * @param htmlContent The raw HTML content
 * @returns Extracted receipt number or null
 */
function extractReceiptNoRegex(htmlContent) {
    // Extract receipt number from the transaction details table
    const pattern = /<td[^>]*class="[^"]*receipttableTd[^"]*receipttableTd2[^"]*"[^>]*>\s*([A-Z0-9]+)\s*<\/td>/i;
    const match = htmlContent.match(pattern);
    if (match)
        return match[1].trim();
    return null;
}
/**
 * Enhanced regex-based extractor for payment date
 * @param htmlContent The raw HTML content
 * @returns Extracted payment date or null
 */
function extractDateRegex(htmlContent) {
    // Extract date in format DD-MM-YYYY HH:MM:SS
    const pattern = /(\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}:\d{2})/;
    const match = htmlContent.match(pattern);
    if (match)
        return match[1].trim();
    return null;
}
/**
 * Generic regex extractor for other fields
 * @param htmlContent The raw HTML content
 * @param labelPattern The label to search for
 * @param valuePattern The pattern for the value (defaults to capturing any non-tag content)
 * @returns Extracted value or null
 */
function extractWithRegex(htmlContent, labelPattern, valuePattern = '([^<]+)') {
    // Escape special regex characters in the label pattern
    const escapedLabel = labelPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`${escapedLabel}.*?<\\/td>\\s*<td[^>]*>\\s*${valuePattern}`, 'i');
    const match = htmlContent.match(pattern);
    if (match)
        return match[1].replace(/<[^>]*>/g, '').trim(); // Strip any remaining HTML tags
    return null;
}
/**
 * Scrapes Telebirr receipt data from HTML content
 * @param html The HTML content to scrape
 * @returns Extracted Telebirr receipt data
 */
function scrapeTelebirrReceipt(html) {
    const $ = cheerio.load(html);
    // Log HTML content in debug mode to help diagnose scraping issues
    logger_1.default.debug(`HTML content length: ${html.length} bytes`);
    if (html.length < 100) {
        logger_1.default.warn(`Suspiciously short HTML response: ${html}`);
    }
    const getText = (selector) => $(selector).next().text().trim();
    const getPaymentDate = () => {
        // First try regex extraction
        const regexDate = extractDateRegex(html);
        if (regexDate)
            return regexDate;
        // Fallback to cheerio
        return $('.receipttableTd').filter((_, el) => $(el).text().includes("-202")).first().text().trim();
    };
    const getReceiptNo = () => {
        // First try regex extraction
        const regexReceiptNo = extractReceiptNoRegex(html);
        if (regexReceiptNo)
            return regexReceiptNo;
        // Fallback to cheerio
        return $('td.receipttableTd.receipttableTd2')
            .eq(1) // second match: the value, not the label
            .text()
            .trim();
    };
    const getSettledAmount = () => extractSettledAmount(html);
    const getServiceFee = () => {
        // First try the enhanced regex approach
        const regexFee = extractServiceFeeRegex(html);
        if (regexFee)
            return regexFee;
        // Fallback to cheerio approach - look for service fee but not service fee VAT
        let fee = $('td.receipttableTd1')
            .filter((_, el) => {
            const text = $(el).text();
            return (text.includes("የአገልግሎት ክፍያ") || text.includes("Service fee")) &&
                !text.includes("ተ.እ.ታ") && !text.includes("VAT");
        })
            .next('td.receipttableTd.receipttableTd2')
            .text()
            .trim();
        // Alternative approach - look in table rows
        if (!fee) {
            fee = $('tr')
                .filter((_, el) => {
                const text = $(el).text();
                return (text.includes("የአገልግሎት ክፍያ") || text.includes("Service fee")) &&
                    !text.includes("ተ.እ.ታ") && !text.includes("VAT");
            })
                .find('td')
                .last()
                .text()
                .trim();
        }
        return fee;
    };
    // Helper function to extract text using regex first, then cheerio
    const getTextWithFallback = (labelText, cheerioSelector) => {
        // Try regex first
        const regexResult = extractWithRegex(html, labelText);
        if (regexResult)
            return regexResult;
        // Fallback to cheerio if selector provided
        if (cheerioSelector) {
            return getText(cheerioSelector);
        }
        // Default cheerio approach
        return getText(`td:contains("${labelText}")`);
    };
    logger_1.default.debug("SERVICE FEE: ", getServiceFee());
    logger_1.default.debug("SETTLED AMOUNT: ", getSettledAmount());
    return {
        payerName: getTextWithFallback("የከፋይ ስም/Payer Name"),
        payerTelebirrNo: getTextWithFallback("የከፋይ ቴሌብር ቁ./Payer telebirr no."),
        creditedPartyName: getTextWithFallback("የገንዘብ ተቀባይ ስም/Credited Party name"),
        creditedPartyAccountNo: getTextWithFallback("የገንዘብ ተቀባይ ቴሌብር ቁ./Credited party account no"),
        transactionStatus: getTextWithFallback("የክፍያው ሁኔታ/transaction status"),
        receiptNo: getReceiptNo(),
        paymentDate: getPaymentDate(),
        settledAmount: getSettledAmount(),
        serviceFee: getServiceFee(),
        serviceFeeVAT: getTextWithFallback("የአገልግሎት ክፍያ ተ.እ.ታ/Service fee VAT"),
        totalPaidAmount: getTextWithFallback("ጠቅላላ የተከፈለ/Total Paid Amount")
    };
}
/**
 * Fetches and processes Telebirr receipt data from the primary source (HTML)
 * @param reference The Telebirr reference number
 * @param baseUrl The base URL to fetch the receipt from
 * @returns The scraped receipt data or null if failed
 */
async function fetchFromPrimarySource(reference, baseUrl) {
    const url = `${baseUrl}${encodeURIComponent(reference)}`;
    try {
        logger_1.default.info(`Attempting to fetch Telebirr receipt from primary source: ${url}`);
        const response = await axios_1.default.get(url, { timeout: 15000, maxRedirects: 0 }); // 15 second timeout
        logger_1.default.debug(`Received response with status: ${response.status}`);
        const extractedData = scrapeTelebirrReceipt(response.data);
        logger_1.default.debug("Extracted data from HTML:", extractedData);
        logger_1.default.info(`Successfully extracted Telebirr data for reference: ${reference}`, {
            receiptNo: extractedData.receiptNo,
            payerName: extractedData.payerName,
            transactionStatus: extractedData.transactionStatus,
            settledAmount: extractedData.settledAmount,
            serviceFee: extractedData.serviceFee
        });
        return extractedData;
    }
    catch (error) {
        // Enhanced error logging with request details
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : undefined;
        // Check if it's an Axios error to safely access response properties
        const axiosError = error;
        const responseDetails = axiosError.response ? {
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            responseData: axiosError.response.data
        } : {};
        logger_1.default.error(`Error fetching Telebirr receipt from primary source ${url}:`, {
            error: errorMessage,
            stack: errorStack,
            ...responseDetails
        });
        return null;
    }
}
/** Verify only against Telebirr's own receipt server. No external relay is used. */
async function verifyTelebirr(reference) {
    const result = await fetchFromPrimarySource(reference, "https://transactioninfo.ethiotelecom.et/receipt/");
    if (result && isValidReceipt(result) && result.receiptNo.toUpperCase() === reference.toUpperCase())
        return result;
    logger_1.default.warn("Telebirr's receipt server could not verify the payment. No relay was contacted.");
    return null;
}
// Add this helper function to validate receipt data
function isValidReceipt(receipt) {
    // Check if essential fields have values
    return Boolean(receipt.receiptNo &&
        receipt.payerName &&
        receipt.transactionStatus &&
        receipt.settledAmount &&
        Number(receipt.settledAmount.replace(/[^\d.]/g, '')) > 0);
}
