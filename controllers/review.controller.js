const Review = require('../models/Review')
const Order = require('../models/Order')
const Service = require('../models/Services')



async function createReview(req, res) {
    try {
        const { comment, rating } = req.body

        if(!rating){return res.status(400).json({message: "Rating is required"})}

        const foundOrder = await Order.findById(req.params.orderId)
        if(!foundOrder) {return res.status(404).json({message: 'Order not found'})}

        if(foundOrder.buyer.toString() !== req.user._id.toString()){
            return res.status(403).json({message: "You cannot review this order"})
        }

        if(foundOrder.status !== 'Delivered'){
            return res.status(400).json({message: "You can only review Delivered orders"})
        }

        const existingReview = await Review.findOne({order: foundOrder._id})

        if(existingReview){return res.status(409).json({message: "This order has already been reviewed"})}

        const createdReview = await Review.create({
            service: foundOrder.service,
            order: foundOrder._id,
            reviewer: req.user._id,
            comment,
            rating
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
        const allServiceReviews = await Review.find({service: req.params.serviceId})
            .populate("reviewer", "username name avatarUrl")
            .select("comment rating reviewer createdAt")

        return res.status(200).json(allServiceReviews)
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


async function updateReview(req, res) {
    try {
        const { comment, rating } = req.body
        const foundReview = await Review.findById(req.params.reviewId)
        if(!foundReview){return res.status(404).json({message: 'Review not found'})}
        if(foundReview.reviewer.toString() !== req.user._id.toString()){
            return res.status(403).json({message: 'You cannot update this review'})
        }
        
        const updatedReview = await Review.findByIdAndUpdate(foundReview._id, {
            comment,
            rating
        }, {new: true, runValidators: true})

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
        if(!foundReview){return res.status(404).json({message: 'Review not found'})}
        if(foundReview.reviewer.toString() !== req.user._id.toString()){
            return res.status(403).json({message: 'You cannot delete this review'})
        }
        
        await Review.findByIdAndDelete(foundReview._id)

        return res.status(200).json({message: 'Review deleted successfully'})
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
  updateReview,
  deleteReview
}