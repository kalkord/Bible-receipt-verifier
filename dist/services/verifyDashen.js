"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyDashen = verifyDashen;
const axios_1 = __importDefault(require("axios"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const https_1 = __importDefault(require("https"));
const logger_1 = __importDefault(require("../utils/logger"));
function titleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}
async function verifyDashen(transactionReference) {
    const url = `https://receipt.dashensuperapp.com/receipt/${transactionReference}`;
    const httpsAgent = new https_1.default.Agent({ rejectUnauthorized: true });
    try {
        logger_1.default.info(`🔎 Fetching Dashen receipt: ${url}`);
        const response = await axios_1.default.get(url, {
            httpsAgent,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/pdf'
            },
            timeout: 30000
        });
        logger_1.default.info('✅ Dashen receipt fetch success, parsing PDF');
        return await parseDashenReceipt(response.data);
    }
    catch (error) {
        logger_1.default.error('❌ Dashen receipt fetch failed:', error.message);
        return {
            success: false,
            error: `Failed to fetch receipt: ${error.message}`
        };
    }
}
async function parseDashenReceipt(buffer) {
    try {
        logger_1.default.info(`📊 PDF buffer size: ${buffer.byteLength} bytes`);
        const parsed = await (0, pdf_parse_1.default)(Buffer.from(buffer));
        const rawText = parsed.text.replace(/\s+/g, ' ').trim();
        logger_1.default.info('📄 Parsing Dashen receipt text');
        logger_1.default.debug(`📝 Raw PDF text length: ${rawText.length} characters`);
        // Log first and last 500 characters of PDF text for debugging
        const textPreview = rawText.length > 1000
            ? `${rawText.substring(0, 500)}...${rawText.substring(rawText.length - 500)}`
            : rawText;
        logger_1.default.debug(`🔍 PDF text preview: ${textPreview}`);
        logger_1.default.info('🔎 Starting field extraction with regex patterns...');
        // Extract sender information
        logger_1.default.debug('👤 Extracting sender information...');
        const senderNameMatch = rawText.match(/Sender\s*Name\s*:?\s*(.*?)\s+(?:Sender\s*Account|Account)/i);
        const senderName = senderNameMatch?.[1]?.trim();
        logger_1.default.debug(`👤 Sender name regex result: ${senderNameMatch ? `Found: "${senderName}"` : 'No match'}`);
        const senderAccountMatch = rawText.match(/Sender\s*Account\s*(?:Number)?\s*:?\s*([A-Z0-9\*\-]+)/i);
        const senderAccountNumber = senderAccountMatch?.[1]?.trim();
        logger_1.default.debug(`🏦 Sender account regex result: ${senderAccountMatch ? `Found: "${senderAccountNumber}"` : 'No match'}`);
        // Extract transaction details
        logger_1.default.debug('💳 Extracting transaction details...');
        const transactionChannelMatch = rawText.match(/Transaction\s*Channel\s*:?\s*(.*?)\s+(?:Service|Type)/i);
        const transactionChannel = transactionChannelMatch?.[1]?.trim();
        logger_1.default.debug(`💳 Transaction channel regex result: ${transactionChannelMatch ? `Found: "${transactionChannel}"` : 'No match'}`);
        const serviceTypeMatch = rawText.match(/Service\s*Type\s*:?\s*(.*?)\s+(?:Narrative|Description)/i);
        const serviceType = serviceTypeMatch?.[1]?.trim();
        logger_1.default.debug(`🔧 Service type regex result: ${serviceTypeMatch ? `Found: "${serviceType}"` : 'No match'}`);
        const narrativeMatch = rawText.match(/Narrative\s*:?\s*(.*?)\s+(?:Receiver|Phone)/i);
        const narrative = narrativeMatch?.[1]?.trim();
        logger_1.default.debug(`📝 Narrative regex result: ${narrativeMatch ? `Found: "${narrative}"` : 'No match'}`);
        // Extract receiver information
        logger_1.default.debug('📞 Extracting receiver information...');
        const receiverNameMatch = rawText.match(/Receiver\s*Name\s*:?\s*(.*?)\s+(?:Phone|Institution)/i);
        const receiverName = receiverNameMatch?.[1]?.trim();
        logger_1.default.debug(`📞 Receiver name regex result: ${receiverNameMatch ? `Found: "${receiverName}"` : 'No match'}`);
        const phoneNoMatch = rawText.match(/Phone\s*(?:No\.?|Number)?\s*:?\s*([\+\d\-\s]+)/i);
        const phoneNo = phoneNoMatch?.[1]?.trim();
        logger_1.default.debug(`📱 Phone number regex result: ${phoneNoMatch ? `Found: "${phoneNo}"` : 'No match'}`);
        const institutionNameMatch = rawText.match(/Institution\s*Name\s*:?\s*(.*?)\s+(?:Transaction|Reference)/i);
        const institutionName = institutionNameMatch?.[1]?.trim();
        logger_1.default.debug(`🏢 Institution name regex result: ${institutionNameMatch ? `Found: "${institutionName}"` : 'No match'}`);
        // Extract reference numbers
        logger_1.default.debug('🔢 Extracting reference numbers...');
        const transactionReferenceMatch = rawText.match(/Transaction\s*Reference\s*:?\s*([A-Z0-9\-]+)/i);
        const transactionReference = transactionReferenceMatch?.[1]?.trim();
        logger_1.default.debug(`🔢 Transaction reference regex result: ${transactionReferenceMatch ? `Found: "${transactionReference}"` : 'No match'}`);
        const transferReferenceMatch = rawText.match(/Transfer\s*Reference\s*:?\s*([A-Z0-9\-]+)/i);
        const transferReference = transferReferenceMatch?.[1]?.trim();
        logger_1.default.debug(`🔄 Transfer reference regex result: ${transferReferenceMatch ? `Found: "${transferReference}"` : 'No match'}`);
        // Extract date
        logger_1.default.debug('📅 Extracting transaction date...');
        const dateMatch = rawText.match(/Transaction\s*Date\s*(?:&\s*Time)?\s*:?\s*([\d\/\-,: ]+(?:[APM]{2})?)/i);
        const dateRaw = dateMatch?.[1]?.trim();
        logger_1.default.debug(`📅 Date regex result: ${dateMatch ? `Found: "${dateRaw}"` : 'No match'}`);
        const transactionDate = dateRaw ? new Date(dateRaw) : undefined;
        if (dateRaw && transactionDate) {
            logger_1.default.debug(`📅 Parsed date: ${transactionDate.toISOString()}`);
        }
        // Extract amounts and fees
        logger_1.default.debug('💰 Extracting amounts and fees...');
        const transactionAmount = extractAmountWithLogging(rawText, /Transaction\s*Amount\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Transaction Amount');
        const serviceCharge = extractAmountWithLogging(rawText, /Service\s*Charge\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Service Charge');
        const exciseTax = extractAmountWithLogging(rawText, /Excise\s*Tax\s*(?:\(15%\))?\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Excise Tax');
        const vat = extractAmountWithLogging(rawText, /VAT\s*(?:\(15%\))?\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'VAT');
        const penaltyFee = extractAmountWithLogging(rawText, /Penalty\s*Fee\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Penalty Fee');
        const incomeTaxFee = extractAmountWithLogging(rawText, /Income\s*Tax\s*Fee\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Income Tax Fee');
        const interestFee = extractAmountWithLogging(rawText, /Interest\s*Fee\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Interest Fee');
        const stampDuty = extractAmountWithLogging(rawText, /Stamp\s*Duty\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Stamp Duty');
        const discountAmount = extractAmountWithLogging(rawText, /Discount\s*Amount\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Discount Amount');
        const total = extractAmountWithLogging(rawText, /Total\s*(?:ETB|Birr)?\s*([\d,]+\.?\d*)/i, 'Total');
        // Apply title case to names
        logger_1.default.debug('✨ Applying title case formatting...');
        const formattedSenderName = senderName ? titleCase(senderName) : undefined;
        const formattedReceiverName = receiverName ? titleCase(receiverName) : undefined;
        const formattedInstitutionName = institutionName ? titleCase(institutionName) : undefined;
        logger_1.default.debug(`✨ Formatted names - Sender: "${formattedSenderName}", Receiver: "${formattedReceiverName}", Institution: "${formattedInstitutionName}"`);
        // Log final extracted data structure
        const extractedData = {
            senderName: formattedSenderName,
            senderAccountNumber,
            transactionChannel,
            serviceType,
            narrative,
            receiverName: formattedReceiverName,
            phoneNo,
            institutionName: formattedInstitutionName,
            transactionReference,
            transferReference,
            transactionDate,
            transactionAmount,
            serviceCharge,
            exciseTax,
            vat,
            penaltyFee,
            incomeTaxFee,
            interestFee,
            stampDuty,
            discountAmount,
            total
        };
        logger_1.default.info('📋 Final extracted data structure:', extractedData);
        // Check if we have minimum required fields
        logger_1.default.debug(`🔍 Validation check - Transaction Reference: ${transactionReference ? '✅' : '❌'}, Transaction Amount: ${transactionAmount ? '✅' : '❌'}`);
        if (transactionReference && transactionAmount) {
            logger_1.default.info('✅ PDF parsing successful - all required fields extracted');
            return {
                success: true,
                ...extractedData
            };
        }
        else {
            logger_1.default.warn('⚠️ PDF parsing failed - missing required fields');
            logger_1.default.warn(`❌ Missing fields: ${!transactionReference ? 'Transaction Reference ' : ''}${!transactionAmount ? 'Transaction Amount' : ''}`);
            return {
                success: false,
                error: 'Could not extract required fields (Transaction Reference and Amount) from PDF.'
            };
        }
    }
    catch (parseErr) {
        logger_1.default.error('❌ Dashen PDF parsing failed:', parseErr.message);
        return {
            success: false,
            error: 'Error parsing PDF data'
        };
    }
}
function extractAmount(text, regex) {
    const match = text.match(regex);
    if (match && match[1]) {
        const cleanAmount = match[1].replace(/,/g, '');
        const amount = parseFloat(cleanAmount);
        return isNaN(amount) ? undefined : amount;
    }
    return undefined;
}
function extractAmountWithLogging(text, regex, fieldName) {
    const match = text.match(regex);
    if (match && match[1]) {
        const rawValue = match[1];
        const cleanAmount = rawValue.replace(/,/g, '');
        const amount = parseFloat(cleanAmount);
        const result = isNaN(amount) ? undefined : amount;
        logger_1.default.debug(`💰 ${fieldName} regex result: Found: "${rawValue}" → Parsed: ${result}`);
        return result;
    }
    else {
        logger_1.default.debug(`💰 ${fieldName} regex result: No match`);
        return undefined;
    }
}
