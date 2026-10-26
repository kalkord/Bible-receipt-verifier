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
exports.verifyAbyssinia = verifyAbyssinia;
const axios_1 = __importStar(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
/**
 * Verify Abyssinia bank transaction by fetching JSON data from their API
 * @param reference Transaction reference (e.g., "FT23062669JJ")
 * @param suffix Last 5 digits of sender's account (e.g., "90172")
 * @returns Promise<Omit<VerifyResult, 'date'> & { date?: string }>
 */
async function verifyAbyssinia(reference, suffix) {
    try {
        logger_1.default.info(`🏦 Starting Abyssinia verification for reference: ${reference} with suffix: ${suffix}`);
        // Construct the API URL
        const apiUrl = `https://cs.bankofabyssinia.com/api/onlineSlip/getDetails/?id=${reference}${suffix}`;
        logger_1.default.info(`📡 Fetching from URL: ${apiUrl}`);
        // Fetch JSON data from the API
        const response = await axios_1.default.get(apiUrl, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        logger_1.default.info(`✅ Successfully fetched response with status: ${response.status}`);
        // Debug log response headers
        logger_1.default.debug(`📋 Response headers:`, JSON.stringify(response.headers, null, 2));
        // Debug log complete response structure
        logger_1.default.debug(`📄 Complete response data:`, JSON.stringify(response.data, null, 2));
        // Debug log response size and content type
        logger_1.default.debug(`📊 Response size: ${JSON.stringify(response.data).length} characters`);
        logger_1.default.debug(`📝 Content-Type: ${response.headers['content-type'] || 'unknown'}`);
        // Parse the JSON response
        const jsonData = response.data;
        // Check if the response has the expected structure
        if (!jsonData || !jsonData.header || !jsonData.body || !Array.isArray(jsonData.body)) {
            logger_1.default.error('❌ Invalid response structure from Abyssinia API');
            return { success: false, error: 'Invalid response structure from Abyssinia API' };
        }
        // Check if the request was successful
        if (jsonData.header.status !== 'success') {
            logger_1.default.error(`❌ API returned error status: ${jsonData.header.status}`);
            return { success: false, error: `API returned error status: ${jsonData.header.status}` };
        }
        // Check if there's data in the body
        if (jsonData.body.length === 0) {
            logger_1.default.error('❌ No transaction data found in response body');
            return { success: false, error: 'No transaction data found in response body' };
        }
        // Extract the first (and typically only) transaction record
        const transactionData = jsonData.body[0];
        logger_1.default.debug(`📋 Raw transaction data from API:`, JSON.stringify(transactionData, null, 2));
        logger_1.default.debug(`🔍 Available fields in transaction data:`, Object.keys(transactionData));
        logger_1.default.debug(`📊 Number of fields in transaction: ${Object.keys(transactionData).length}`);
        // Map the response fields to standardized VerifyResult structure with detailed field-by-field logging
        logger_1.default.debug(`🔄 Starting field mapping process...`);
        // Extract and parse the amount
        const transferredAmountStr = transactionData['Transferred Amount'] || '';
        const amount = transferredAmountStr ? parseFloat(transferredAmountStr.replace(/[^\d.-]/g, '')) : undefined;
        // Parse the date
        const transactionDateStr = transactionData['Transaction Date'] || '';
        const date = transactionDateStr || undefined; // Preserve the bank timestamp without guessing its format/timezone.
        const result = {
            success: true,
            payer: transactionData["Payer's Name"] || undefined,
            payerAccount: transactionData['Source Account'] || undefined,
            receiver: transactionData["Receiver's Name"] || transactionData['Source Account Name'] || undefined,
            receiverAccount: transactionData["Receiver's Account"] || undefined,
            amount: amount,
            date: date,
            reference: transactionData['Transaction Reference'] || undefined,
            reason: transactionData['Narrative'] || null
        };
        // Debug log each field mapping
        logger_1.default.debug(`🏷️  Field mappings:`);
        logger_1.default.debug(`   payer: "${transactionData["Payer's Name"]}" -> "${result.payer}"`);
        logger_1.default.debug(`   payerAccount: "${transactionData['Source Account']}" -> "${result.payerAccount}"`);
        logger_1.default.debug(`   receiver: "${transactionData['Source Account Name']}" -> "${result.receiver}"`);
        logger_1.default.debug(`   amount: "${transactionData['Transferred Amount']}" -> ${result.amount}`);
        logger_1.default.debug(`   date: "${transactionData['Transaction Date']}" -> ${result.date}`);
        logger_1.default.debug(`   reference: "${transactionData['Transaction Reference']}" -> "${result.reference}"`);
        logger_1.default.debug(`   reason: "${transactionData['Narrative']}" -> "${result.reason}"`);
        logger_1.default.debug(`✅ Field mapping completed. Mapped ${Object.keys(result).length} fields.`);
        logger_1.default.debug(`📋 Final mapped result object:`, JSON.stringify(result, null, 2));
        logger_1.default.info(`✅ Successfully parsed Abyssinia receipt for reference: ${result.reference}`);
        logger_1.default.debug(`💰 Key transaction details - Amount: ${result.amount}, Payer: ${result.payer}, Date: ${result.date}`);
        // Validate that we have essential fields
        if (result.reference !== reference || !Number.isFinite(result.amount) || !result.amount || result.amount <= 0 || (!result.payer && !result.receiver)) {
            logger_1.default.error('❌ Missing essential fields in transaction data');
            return { success: false, error: 'Missing essential fields in transaction data' };
        }
        return result;
    }
    catch (error) {
        if (error instanceof axios_1.AxiosError) {
            logger_1.default.error(`❌ HTTP Error fetching Abyssinia receipt: ${error.message}`);
            if (error.response) {
                logger_1.default.error(`📊 Response status: ${error.response.status}`);
                logger_1.default.error(`📄 Response data:`, error.response.data);
            }
        }
        else {
            logger_1.default.error(`❌ Unexpected error in verifyAbyssinia:`, error);
        }
        return { success: false, error: 'Failed to verify Abyssinia transaction' };
    }
}
