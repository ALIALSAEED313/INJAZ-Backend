const mongoose = require("mongoose");

const paymentDetailsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    iban: {
      type: String,
      required: true,
      trim: true,
    },
    swiftCode: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      enum: ["AED", "BHD", "EUR", "GBP", "JOD", "KWD", "OMR", "QAR", "SAR", "USD"],
    },
    paymentMethod: {
      type: String,
      required: true,
      trim: true,
      enum: ["Bank Transfer", "Wire Transfer", "ACH", "SEPA", "Direct Deposit"],
    },
  },
  { timestamps: true },
);

paymentDetailsSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    delete returnedObject.__v;
  },
});

const PaymentDetails = mongoose.model("PaymentDetails", paymentDetailsSchema);

module.exports = PaymentDetails;
