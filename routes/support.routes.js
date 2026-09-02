const router = require("express").Router()
const rateLimit = require("express-rate-limit")
const { askAi } = require("../controllers/support.controller")

const aiSupportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "AI support is busy. Please wait a moment, use Quick Help, or contact support@injaz.com." },
})

router.post("/ai", aiSupportLimiter, askAi)

module.exports = router
