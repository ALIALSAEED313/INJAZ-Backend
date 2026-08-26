const Conversation = require('../models/Conversation')
const Message = require('../models/Message')


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

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: newMessage._id
        })

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