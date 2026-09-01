const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: ['ORDER_REQUESTED', 'ORDER_CREATED', 'STATUS_CHANGED', 'NEW_MESSAGE'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

notificationSchema.index(
    { order: 1, type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            order: { $exists: true },
            type: 'ORDER_REQUESTED'
        }
    }
);

module.exports = mongoose.model('Notification', notificationSchema);
