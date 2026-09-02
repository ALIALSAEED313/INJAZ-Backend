const router = require("express").Router()
const verifyToken = require("../middleware/verifyToken")
const isAdmin = require("../middleware/isAdmin")
const { createReport, getReports, updateReportStatus } = require("../controllers/report.controller")

router.post("/", verifyToken, createReport)
router.get("/admin", verifyToken, isAdmin, getReports)
router.patch("/:reportId/status", verifyToken, isAdmin, updateReportStatus)

module.exports = router
