const { askInjazSupport, MAX_MESSAGE_LENGTH } = require("../services/aiSupport.service")

async function askAi(req, res) {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : ""
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ message: `Question must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` })
  }

  try {
    const result = await askInjazSupport({
      message,
      conversation: req.body.conversation,
      page: req.body.page,
    })
    return res.status(200).json(result)
  } catch (error) {
    if (error.code === "AI_NOT_CONFIGURED") {
      return res.status(503).json({ message: "AI support is temporarily unavailable. Please use Quick Help or contact support@injaz.com." })
    }
    const status = error.status === 429 ? 429 : error.code === "ETIMEDOUT" || error.name === "AbortError" ? 504 : 502
    if (process.env.NODE_ENV === "production") {
      console.error("AI support provider request failed")
    } else {
      console.error("AI support request failed:", {
        message: error.message,
        status: error.status || null,
        code: error.code || null,
        type: error.type || null,
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      })
    }
    return res.status(status).json({ message: "AI support is temporarily unavailable. Please use Quick Help or contact support@injaz.com." })
  }
}

module.exports = { askAi }
