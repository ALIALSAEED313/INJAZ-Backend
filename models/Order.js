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
        enum: ['Requested', 'Pending', 'In Progress', 'Delivered', 'Completed', 'Cancelled'],
        default: 'Requested'
    },
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending",
    },
    tapChargeId: {
        type: String,
        trim: true,
    },
    paidAt: Date,
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    delivery: {
        message: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        files: [{
            url: { type: String, required: true },
            fileId: String,
            name: { type: String, required: true },
            mimeType: String,
            size: Number,
        }],
        deliveredAt: Date,
    },
    revision: {
        message: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        requestedAt: Date,
    },
}, { timestamps: true })

orderSchema.index(
    { tapChargeId: 1 },
    {
        unique: true,
        partialFilterExpression: { tapChargeId: { $exists: true, $gt: "" } },
    }
)

module.exports = mongoose.model('Order', orderSchema)
