const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendNotificationEmail } = require("../utils/emailService");

async function getOrCreateConversation(req, res) {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user._id;

    let conversation = await Conversation.findOne({
      participants: { $all: [currentUserId, participantId] },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [currentUserId, participantId],
      });
    }

    res.status(200).json({ conversation });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching conversation", err: err.message });
  }
}

async function sendMessage(req, res) {
  try {
    const { conversationId, content, serviceId } = req.body;
    const senderId = req.user._id;

    const newMessage = await Message.create({
      conversation: conversationId,
      content: content,
      sender: senderId,
      service: serviceId,
    });

    const conv = await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
    });

    if (conv && conv.participants) {
      const recipientId = conv.participants.find(
        (p) => p.toString() !== senderId.toString(),
      );
      if (recipientId) {
        const notification = await Notification.create({
          recipient: recipientId,
          sender: senderId,
          type: "NEW_MESSAGE",
          title: "New Message Received",
          message:
            content.length > 60 ? content.substring(0, 57) + "..." : content,
        });

        const recipient =
          await User.findById(recipientId).select("email username");
        if (recipient?.email) {
          await sendNotificationEmail({
            to: recipient.email,
            subject: notification.title,
            text: notification.message,
            html: `<p>${notification.message}</p>`,
          });
        }
      }
    }

    await newMessage.populate("sender", "username avatarUrl");

    res.status(201).json({ message: "Message sent", data: newMessage });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error sending message", err: err.message });
  }
}

async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username avatarUrl")
      .sort({ createdAt: 1 });

    res.status(200).json({ messages });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching messages", err: err.message });
  }
}

async function getConversations(req, res) {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "username name avatarUrl")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender",
          select: "username avatarUrl",
        },
      })
      .sort({ updatedAt: -1 });

    const normalizedConversations = conversations.map((conversation) => {
      const participant = conversation.participants.find(
        (person) => person._id.toString() !== req.user._id.toString(),
      );

      return {
        ...conversation.toObject(),
        participant: participant || null,
      };
    });

    return res.status(200).json({ conversations: normalizedConversations });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching conversations",
      err: err.message,
    });
  }
}

async function getUnreadChats(req, res) {
  try {
    const unreadConversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "username name avatarUrl")
      .sort({ updatedAt: -1 });

    const enriched = [];

    for (const conversation of unreadConversations) {
      const unreadMessages = await Message.find({
        conversation: conversation._id,
        sender: { $ne: req.user._id },
        isRead: false,
      })
        .populate("sender", "username name avatarUrl")
        .sort({ createdAt: -1 });

      if (unreadMessages.length > 0) {
        const participant = conversation.participants.find(
          (person) => person._id.toString() !== req.user._id.toString(),
        );

        enriched.push({
          _id: conversation._id,
          participant: participant || null,
          lastMessage: unreadMessages[0],
          unreadCount: unreadMessages.length,
        });
      }
    }

    return res.status(200).json({ conversations: enriched });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching unread chats",
      err: err.message,
    });
  }
}

async function markConversationAsRead(req, res) {
  try {
    const { conversationId } = req.params;

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        isRead: false,
      },
      { isRead: true },
    );

    return res.status(200).json({ message: "Conversation marked as read" });
  } catch (err) {
    return res.status(500).json({
      message: "Error marking conversation as read",
      err: err.message,
    });
  }
}

async function updateMessage(req, res) {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only edit your own messages" });
    }

    message.content = content.trim();
    await message.save();

    return res.status(200).json({ message: "Message updated", data: message });
  } catch (err) {
    return res.status(500).json({
      message: "Error updating message",
      err: err.message,
    });
  }
}

async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "You can only delete your own messages" });
    }

    await message.deleteOne();

    const conversation = await Conversation.findById(message.conversation);
    if (conversation) {
      const remainingMessages = await Message.find({
        conversation: conversation._id,
      }).sort({ createdAt: 1 });
      if (remainingMessages.length > 0) {
        conversation.lastMessage =
          remainingMessages[remainingMessages.length - 1]._id;
      } else {
        conversation.lastMessage = null;
      }
      await conversation.save();
    }

    return res.status(200).json({ message: "Message deleted" });
  } catch (err) {
    return res.status(500).json({
      message: "Error deleting message",
      err: err.message,
    });
  }
}

async function deleteConversation(req, res) {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (person) => person.toString() === req.user._id.toString(),
    );

    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "You are not part of this conversation" });
    }

    await Message.deleteMany({ conversation: conversationId });
    await conversation.deleteOne();

    return res.status(200).json({ message: "Conversation deleted" });
  } catch (err) {
    return res.status(500).json({
      message: "Error deleting conversation",
      err: err.message,
    });
  }
}

module.exports = {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  getConversations,
  getUnreadChats,
  markConversationAsRead,
  updateMessage,
  deleteMessage,
  deleteConversation,
};
