const Conversation = require('../models/Conversation')
const Message = require('../models/Message')
const Notification = require('../models/Notification')


async function getOrCreateConversation(req, res){
    try{
        const {participantId} = req.body
        const currentUserId = req.user._id

        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, participantId]}
        })
        if(!conversation){
            conversation = await Conversation.create({
                participants: [currentUserId, participantId]
            })
        }

        res.status(200).json({ conversation })
    }
    catch(err){
        res.status(500).json({ message: 'Error fetching conversation', err: err.message})
    }
}


async function sendMessage(req, res){
    try{
        const { conversationId, content, serviceId } = req.body
        const senderId = req.user._id

        const newMessage = await Message.create({
            conversation: conversationId,
            content: content,
            sender: senderId,
            service: serviceId
        })

        const conv = await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: newMessage._id
        })

        if (conv && conv.participants) {
            const recipientId = conv.participants.find(p => p.toString() !== senderId.toString())
            if (recipientId) {
                await Notification.create({
                    recipient: recipientId,
                    sender: senderId,
                    type: 'NEW_MESSAGE',
                    title: 'New Message Received',
                    message: content.length > 60 ? content.substring(0, 57) + '...' : content
                })
            }
        }

        await newMessage.populate('sender', 'username avatarUrl')

        res.status(201).json({ message: 'Message sent', data: newMessage})
    }
    catch(err){
        res.status(500).json({ message: 'Error sending message', err: err.message})
    }
}

async function getMessages(req, res){
    try{
        const { conversationId } = req.params

        const messages = await Message.find({ conversation: conversationId})
        .populate('sender', 'username avatarUrl')
        .sort({ createdAt: 1})

        res.status(200).json({ messages })
    }
    catch(err){
        res.status(500).json({ message: 'Error fetching messages', err: err.message})
    }
}

module.exports = {
    getOrCreateConversation,
    getMessages,
    sendMessage
}