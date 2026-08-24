const express = require('express')
const router = express.Router()
const { getOrCreateConversation, sendMessage, getMessages } = require('../controllers/chatController')

const verifyToken = require("../middleware/verifyToken")

router.use(verifyToken)
router.post('/conversations', getOrCreateConversation)
router.post('/messages', sendMessage)
router.get('/conversations/:conversationId/messages', getMessages)

module.exports = router