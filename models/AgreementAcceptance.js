const mongoose = require("mongoose");

const agreementAcceptanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  agreement: { type: mongoose.Schema.Types.ObjectId, ref: "Agreement", required: true, index: true },
  version: { type: String, required: true, trim: true },
  acceptedAt: { type: Date, default: Date.now, required: true },
  // Spec §2.14 acceptanceMethod + §4: web | registration.
  acceptanceMethod: { type: String, enum: ["web", "registration"], default: "web", required: true },
  // Spec §4: only stored "where appropriate and legally permitted".
  ipAddress: { type: String, trim: true },
  userAgent: { type: String, trim: true, maxlength: 1000 },
  // Spec §2.14: record which family of terms was accepted (buyer-seller today).
  agreementType: { type: String, default: "buyer-seller", trim: true },
  // Spec §2.14: explicit acceptance flag; never delete rows when new versions publish.
  status: { type: String, enum: ["accepted"], default: "accepted" },
}, { timestamps: true });

agreementAcceptanceSchema.index({ user: 1, agreement: 1 }, { unique: true });
module.exports = mongoose.model("AgreementAcceptance", agreementAcceptanceSchema);
