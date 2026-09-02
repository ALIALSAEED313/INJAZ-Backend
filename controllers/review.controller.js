const Review = require('../models/Review')
const Order = require('../models/Order')
const Service = require('../models/Services')
const mongoose = require('mongoose')



async function createReview(req, res) {
    try {
        const { comment, rating } = req.body

        const numericRating = Number(rating)
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: "Rating must be an integer from 1 to 5" })
        }

        const foundOrder = await Order.findOne({
            _id: req.params.orderId,
            paymentStatus: "paid"
        })
        if (!foundOrder) { return res.status(404).json({ message: 'Order not found' }) }

        if (foundOrder.buyer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You cannot review this order" })
        }

        if (foundOrder.status !== 'Completed') {
            return res.status(400).json({ message: "You can only review Completed orders" })
        }

        const existingReview = await Review.findOne({ order: foundOrder._id })

        if (existingReview) { return res.status(409).json({ message: "This order has already been reviewed" }) }

        const createdReview = await Review.create({
            service: foundOrder.service,
            order: foundOrder._id,
            reviewer: req.user._id,
            comment,
            rating: numericRating
        })

        return res.status(201).json(createdReview)

    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        })
    }
}


async function getServiceReviews(req, res) {
    try {
        const page = Math.max(Number(req.query.page) || 1, 1)
        const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20)
        const sortOptions = {
            recent: { createdAt: -1 },
            highest: { rating: -1, createdAt: -1 },
            lowest: { rating: 1, createdAt: -1 }
        }
        const sort = sortOptions[req.query.sort] || sortOptions.recent
        const filter = { service: req.params.serviceId }

        const [reviews, totalReviews, summaryRows] = await Promise.all([
          Review.find(filter)
            .populate("reviewer", "username name avatarUrl")
            .select("comment rating reviewer createdAt")
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit),
          Review.countDocuments(filter),
          Review.aggregate([
            { $match: { service: new mongoose.Types.ObjectId(req.params.serviceId) } },
            {
              $group: {
                _id: "$rating",
                count: { $sum: 1 },
                total: { $sum: "$rating" }
              }
            }
          ])
        ])

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        let ratingTotal = 0
        summaryRows.forEach(row => {
          distribution[row._id] = row.count
          ratingTotal += row.total
        })

        return res.status(200).json({
          reviews,
          summary: {
            averageRating: totalReviews ? ratingTotal / totalReviews : 0,
            reviewCount: totalReviews,
            distribution
          },
          pagination: {
            page,
            limit,
            totalPages: Math.ceil(totalReviews / limit),
            hasMore: page * limit < totalReviews
          }
        })
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

async function getReviewsForSeller(req, res) {
    try {
        const sellerServices = await Service.find({
            freelancer: req.params.userId
        }).select("_id")

        const serviceIds = sellerServices.map(
            (service) => service._id
        )

        const reviews = await Review.find({
            service: { $in: serviceIds }
        })
            .populate("reviewer", "username name avatarUrl country")
            .populate("service", "title name")
            .select("comment rating reviewer service createdAt")

        return res.status(200).json(reviews)
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

async function getReviewByOrder(req, res) {
    try {
        const order = await Order.findOne({
            _id: req.params.orderId,
            paymentStatus: "paid",
            $or: [{ buyer: req.user._id }, { seller: req.user._id }]
        })
        if (!order) {
            return res.status(404).json({ message: "Order not found" })
        }

        const review = await Review.findOne({
            order: req.params.orderId
        })
            .populate("reviewer", "username name avatarUrl")
            .select("comment rating reviewer createdAt")

        if (!review) {
            return res.status(200).json({
                hasReviewed: false,
                review: null
            })
        }

        return res.status(200).json({
            hasReviewed: true,
            review
        })

    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error"
        })
    }
}

async function updateReview(req, res) {
    try {
        const { comment, rating } = req.body
        const numericRating = Number(rating)
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: "Rating must be an integer from 1 to 5" })
        }
        const foundReview = await Review.findById(req.params.reviewId)
        if (!foundReview) { return res.status(404).json({ message: 'Review not found' }) }
        if (foundReview.reviewer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You cannot update this review' })
        }

        const updatedReview = await Review.findByIdAndUpdate(foundReview._id, {
            comment,
            rating: numericRating
        }, { new: true, runValidators: true })

        return res.status(200).json(updatedReview)
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        })
    }
}

async function deleteReview(req, res) {
    try {
        const foundReview = await Review.findById(req.params.reviewId)
        if (!foundReview) { return res.status(404).json({ message: 'Review not found' }) }
        if (foundReview.reviewer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You cannot delete this review' })
        }

        await Review.findByIdAndDelete(foundReview._id)

        return res.status(200).json({ message: 'Review deleted successfully' })
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        })
    }
}


module.exports = {
    createReview,
    getServiceReviews,
    getReviewsForSeller,
    getReviewByOrder,
    updateReview,
    deleteReview
}
