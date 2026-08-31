const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
    service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Requested', 'Pending', 'In Progress', 'Delivered', 'Cancelled'],
        default: 'Requested'
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
    },
    tapChargeId: {
        type: String,
        default: "",
    },
}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)