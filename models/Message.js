const mongoose = require('mongoose')
const Conversation = require('./Conversation')

const messageSchema = new mongoose.Schema({

    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    content:{
        type: String,
        default: ""
    },
    attachment: {
        url: { type: String },
        name: { type: String },
        mimeType: { type: String },
        size: { type: Number }
    },
    service:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isRead:{
        type: Boolean,
        default: false
    }
}, {timestamps: true})


module.exports = mongoose.model('Message', messageSchema)
