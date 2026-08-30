const express = require("express");
const router = express.Router();
const {
  getOrCreateConversation,
  sendMessage,
  getMessages,
  getConversations,
  getUnreadChats,
  markConversationAsRead,
  updateMessage,
  deleteMessage,
  deleteConversation,
} = require("../controllers/chatController");

const verifyToken = require("../middleware/verifyToken");

router.use(verifyToken);
router.get("/conversations", getConversations);
router.get("/unread", getUnreadChats);
router.post("/conversations", getOrCreateConversation);
router.delete("/conversations/:conversationId", deleteConversation);
router.post("/messages", sendMessage);
router.put("/messages/:messageId", updateMessage);
router.delete("/messages/:messageId", deleteMessage);
router.put("/conversations/:conversationId/read", markConversationAsRead);
router.get("/conversations/:conversationId/messages", getMessages);

module.exports = router;
