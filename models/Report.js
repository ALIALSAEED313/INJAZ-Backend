const mongoose = require("mongoose")

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: ["USER", "SERVICE", "REVIEW"], required: true, index: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  reason: {
    type: String,
    enum: ["SPAM", "SCAM", "HARASSMENT", "INAPPROPRIATE", "MISLEADING", "COPYRIGHT", "SUSPICIOUS", "OTHER"],
    required: true,
  },
  details: { type: String, trim: true, maxlength: 1000, default: "" },
  status: { type: String, enum: ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"], default: "OPEN", index: true },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true })

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1, createdAt: -1 })

module.exports = mongoose.model("Report", reportSchema)
