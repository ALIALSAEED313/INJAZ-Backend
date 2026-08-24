const mongoose = require('mongoose')


// Schema
const reviewSchema = new mongoose.Schema({
    service:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    reviewer:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    order:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        unique: true,
        required: true
    },
    rating:{
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment:{
        type: String,
        trim: true
    }
}, {timestamps: true})


// model
const Review = mongoose.model('Review', reviewSchema)

module.exports = Review