const User = require('../models/User')
const Service = require('../models/Services')
const Order = require('../models/Order')
const Review = require('../models/Review')



async function getStats(req, res){
    try {
        const allUsers = await User.countDocuments({ isDeleted: false })
        const allSellers = await User.countDocuments({ isDeleted: false, isSeller: true })
        const allServices = await Service.countDocuments()
        const allOrders = await Order.countDocuments()
        const allReviews = await Review.countDocuments()

        return res.status(200).json({
            users: allUsers,
            sellers: allSellers,
            services: allServices,
            orders: allOrders,
            reviews: allReviews
        })
    } catch (err) {
       console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        }) 
    }
}

async function deleteUser(req, res) {
    try {
        if (req.user._id.toString() === req.params.userId.toString()) {return res.status(403).json({message: 'You cannot delete your user'})}
        
        const deletedUser = await User.findByIdAndUpdate(req.params.userId, 
            {
                isDeleted: true
            },
            {
                new: true
            }
        )

        if(!deletedUser){return res.status(404).json({message: 'User not found'})}

        return res.status(200).json({message: 'User deleted successfully'})

    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        }) 
    }
}


async function deleteService(req, res) {
    try {
        const deletedService = await Service.findByIdAndDelete(req.params.serviceId)
        if(!deletedService){return res.status(404).json({message: 'Service not found'})}
        
        await Review.deleteMany({service: req.params.serviceId})

        return res.status(200).json({message: 'Service deleted successfully'})
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        }) 
    }
}

async function deleteOrder(req, res) {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.orderId)
        if(!deletedOrder){return res.status(404).json({message: 'Order not found'})}

        await Review.deleteOne({order: req.params.orderId})

        return res.status(200).json({message: 'Order deleted successfully'})
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        }) 
    }
}


async function deleteReview(req, res) {
    try {
        const deletedReview = await Review.findByIdAndDelete(req.params.reviewId)
        if(!deletedReview){return res.status(404).json({message: 'Review not found'})}

        return res.status(200).json({message: 'Review deleted successfully'})
    } catch (err) {
        console.error(err)

        return res.status(500).json({
            message: "Internal Server Error",
        }) 
    }
}

