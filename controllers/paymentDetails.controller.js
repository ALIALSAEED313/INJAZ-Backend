const PaymentDetails = require("../models/PaymentDetails");

const VALID_CURRENCIES = new Set([
  "AED",
  "BHD",
  "EUR",
  "GBP",
  "JOD",
  "KWD",
  "OMR",
  "QAR",
  "SAR",
  "USD",
]);

const VALID_PAYMENT_METHODS = new Set([
  "Bank Transfer",
  "Wire Transfer",
  "ACH",
  "SEPA",
  "Direct Deposit",
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIban(value) {
  return normalizeText(value).replace(/\s+/g, "").toUpperCase();
}

function normalizeSwift(value) {
  return normalizeText(value).replace(/\s+/g, "").toUpperCase();
}

function maskIban(iban = "") {
  const normalized = normalizeIban(iban);

  if (!normalized) {
    return "";
  }

  const visibleStart = normalized.slice(0, 2);
  const visibleEnd = normalized.slice(-4);
  const hiddenLength = Math.max(0, normalized.length - visibleStart.length - visibleEnd.length);

  return `${visibleStart}${"•".repeat(Math.min(hiddenLength, 12))}${visibleEnd}`;
}

function validateIban(value) {
  const normalized = normalizeIban(value);
  return /^[A-Z]{2}[0-9A-Z]{11,30}$/.test(normalized);
}

function validateSwift(value) {
  if (!value) {
    return true;
  }

  const normalized = normalizeSwift(value);
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized);
}

function buildPaymentResponse(detail) {
  const maskedIban = maskIban(detail.iban);

  return {
    _id: detail._id,
    accountHolderName: detail.accountHolderName,
    bankName: detail.bankName,
    iban: maskedIban,
    maskedIban,
    swiftCode: detail.swiftCode || "",
    country: detail.country,
    currency: detail.currency,
    paymentMethod: detail.paymentMethod,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

async function getPaymentDetails(req, res) {
  try {
    const paymentDetails = await PaymentDetails.findOne({ user: req.user._id }).lean();

    if (!paymentDetails) {
      return res.status(404).json({ message: "No payment details found." });
    }

    return res.status(200).json(buildPaymentResponse(paymentDetails));
  } catch (error) {
    return res.status(500).json({ message: "Unable to fetch payment details." });
  }
}

async function createPaymentDetails(req, res) {
  try {
    const payload = {
      user: req.user._id,
      accountHolderName: normalizeText(req.body.accountHolderName),
      bankName: normalizeText(req.body.bankName),
      iban: normalizeIban(req.body.iban),
      swiftCode: normalizeSwift(req.body.swiftCode),
      country: normalizeText(req.body.country),
      currency: normalizeText(req.body.currency).toUpperCase(),
      paymentMethod: normalizeText(req.body.paymentMethod),
    };

    if (!payload.accountHolderName) {
      return res.status(400).json({ message: "Account holder name is required." });
    }
    if (!payload.bankName) {
      return res.status(400).json({ message: "Bank name is required." });
    }
    if (!payload.iban) {
      return res.status(400).json({ message: "IBAN is required." });
    }
    if (!validateIban(payload.iban)) {
      return res.status(400).json({ message: "Please enter a valid IBAN." });
    }
    if (!payload.country) {
      return res.status(400).json({ message: "Country is required." });
    }
    if (!payload.currency) {
      return res.status(400).json({ message: "Currency is required." });
    }
    if (!VALID_CURRENCIES.has(payload.currency)) {
      return res.status(400).json({ message: "Please enter a valid currency code." });
    }
    if (!payload.paymentMethod) {
      return res.status(400).json({ message: "Payment method is required." });
    }
    if (!VALID_PAYMENT_METHODS.has(payload.paymentMethod)) {
      return res.status(400).json({ message: "Please choose a valid payment method." });
    }
    if (!validateSwift(payload.swiftCode)) {
      return res.status(400).json({ message: "Please enter a valid SWIFT/BIC code." });
    }

    const existing = await PaymentDetails.findOne({ user: req.user._id });
    if (existing) {
      return res.status(409).json({ message: "Payment details already exist for this user." });
    }

    const paymentDetails = await PaymentDetails.create(payload);

    return res.status(201).json(buildPaymentResponse(paymentDetails));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Payment details already exist for this user." });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to save payment details." });
  }
}

async function updatePaymentDetails(req, res) {
  try {
    const existing = await PaymentDetails.findOne({ user: req.user._id });

    if (!existing) {
      return res.status(404).json({ message: "No payment details found." });
    }

    const payload = {
      accountHolderName: normalizeText(req.body.accountHolderName ?? existing.accountHolderName),
      bankName: normalizeText(req.body.bankName ?? existing.bankName),
      iban: normalizeIban(req.body.iban ?? existing.iban),
      swiftCode: normalizeSwift(req.body.swiftCode ?? existing.swiftCode),
      country: normalizeText(req.body.country ?? existing.country),
      currency: normalizeText(req.body.currency ?? existing.currency).toUpperCase(),
      paymentMethod: normalizeText(req.body.paymentMethod ?? existing.paymentMethod),
    };

    if (!payload.accountHolderName) {
      return res.status(400).json({ message: "Account holder name is required." });
    }
    if (!payload.bankName) {
      return res.status(400).json({ message: "Bank name is required." });
    }
    if (!payload.iban || !validateIban(payload.iban)) {
      return res.status(400).json({ message: "Please enter a valid IBAN." });
    }
    if (!payload.country) {
      return res.status(400).json({ message: "Country is required." });
    }
    if (!payload.currency || !VALID_CURRENCIES.has(payload.currency)) {
      return res.status(400).json({ message: "Please enter a valid currency code." });
    }
    if (!payload.paymentMethod || !VALID_PAYMENT_METHODS.has(payload.paymentMethod)) {
      return res.status(400).json({ message: "Please choose a valid payment method." });
    }
    if (!validateSwift(payload.swiftCode)) {
      return res.status(400).json({ message: "Please enter a valid SWIFT/BIC code." });
    }

    const updated = await PaymentDetails.findOneAndUpdate(
      { user: req.user._id },
      payload,
      { new: true, runValidators: true },
    );

    return res.status(200).json(buildPaymentResponse(updated));
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unable to update payment details." });
  }
}

async function deletePaymentDetails(req, res) {
  try {
    const deleted = await PaymentDetails.findOneAndDelete({ user: req.user._id });

    if (!deleted) {
      return res.status(404).json({ message: "No payment details found." });
    }

    return res.status(200).json({ message: "Payment details deleted successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Unable to delete payment details." });
  }
}

module.exports = {
  getPaymentDetails,
  createPaymentDetails,
  updatePaymentDetails,
  deletePaymentDetails,
};
