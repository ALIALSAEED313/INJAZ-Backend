const mongoose = require("mongoose")
const Report = require("../models/Report")
const User = require("../models/User")
const Service = require("../models/Services")
const Review = require("../models/Review")

const TARGET_MODELS = { USER: User, SERVICE: Service, REVIEW: Review }
const REASONS = new Set(["SPAM", "SCAM", "HARASSMENT", "INAPPROPRIATE", "MISLEADING", "COPYRIGHT", "SUSPICIOUS", "OTHER"])
const STATUSES = new Set(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"])

async function createReport(req, res) {
  try {
    const targetType = String(req.body.targetType || "").toUpperCase()
    const targetId = String(req.body.targetId || "")
    const reason = String(req.body.reason || "").toUpperCase()
    const details = String(req.body.details || "").trim()
    const Target = TARGET_MODELS[targetType]

    if (!Target || !REASONS.has(reason) || !mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: "Invalid report target or reason" })
    }
    if (details.length > 1000) return res.status(400).json({ message: "Report details are too long" })
    if (targetType === "USER" && targetId === String(req.user._id)) {
      return res.status(400).json({ message: "You cannot report your own profile" })
    }

    const target = await Target.findById(targetId).select("_id")
    if (!target) return res.status(404).json({ message: "Report target not found" })

    const duplicateSince = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const duplicate = await Report.findOne({
      reporter: req.user._id,
      targetType,
      targetId,
      createdAt: { $gte: duplicateSince },
    })
    if (duplicate) return res.status(409).json({ message: "You already reported this item recently" })

    const report = await Report.create({ reporter: req.user._id, targetType, targetId, reason, details })
    return res.status(201).json({ report, message: "Report submitted. Our team will review it." })
  } catch (error) {
    return res.status(500).json({ message: "Unable to submit report", error: error.message })
  }
}

async function getReports(req, res) {
  try {
    const filter = req.query.status && STATUSES.has(req.query.status) ? { status: req.query.status } : {}
    const reports = await Report.find(filter)
      .populate("reporter", "username name email")
      .populate("resolvedBy", "username name")
      .sort({ createdAt: -1 })
      .lean()

    const withTargets = await Promise.all(reports.map(async report => {
      const Target = TARGET_MODELS[report.targetType]
      const fields = report.targetType === "USER" ? "username name" : report.targetType === "SERVICE" ? "title" : "comment rating service"
      const target = Target ? await Target.findById(report.targetId).select(fields).lean() : null
      return { ...report, target }
    }))
    return res.status(200).json(withTargets)
  } catch (error) {
    return res.status(500).json({ message: "Unable to load reports", error: error.message })
  }
}

async function updateReportStatus(req, res) {
  try {
    const status = String(req.body.status || "").toUpperCase()
    if (!STATUSES.has(status)) return res.status(400).json({ message: "Invalid report status" })
    const resolved = ["RESOLVED", "DISMISSED"].includes(status)
    const report = await Report.findByIdAndUpdate(req.params.reportId, {
      status,
      resolvedAt: resolved ? new Date() : null,
      resolvedBy: resolved ? req.user._id : null,
    }, { new: true, runValidators: true })
    if (!report) return res.status(404).json({ message: "Report not found" })
    return res.status(200).json(report)
  } catch (error) {
    return res.status(500).json({ message: "Unable to update report", error: error.message })
  }
}

module.exports = { createReport, getReports, updateReportStatus }
