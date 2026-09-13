const mongoose = require("mongoose");

const agreementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  content: { type: String, required: true },
  version: { type: String, required: true, trim: true, unique: true },
  status: { type: String, enum: ["Draft", "Published", "Archived"], default: "Draft", index: true },
  effectiveDate: { type: Date, required: true, index: true },
  // Kept for spec §2.15: when true, marketplace activity is blocked until the user accepts.
  requiresAcceptance: { type: Boolean, default: true },
  // Allows future agreement families (buyer-seller, privacy, terms) without a new collection.
  agreementType: { type: String, default: "buyer-seller", trim: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

// Only one Published version is active at a time (enforced in publish controller),
// but this compound index speeds up "current agreement" lookups.
agreementSchema.index({ status: 1, effectiveDate: -1 });

module.exports = mongoose.model("Agreement", agreementSchema);
