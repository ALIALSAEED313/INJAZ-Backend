const Order = require('../models/Order')
const User = require('../models/User')

async function createOrder(req, res){
    try{
        const {serviceId, sellerId, price} = req.body
        const buyerId = req.user._id

        const newOrder = await Order.create({
            service: serviceId,
            buyer: buyerId,
            seller: sellerId,
            price: price,
            status: 'Pending'
        })

        res.status(201).json({ message: "Order created successfully", order: newOrder})
    }
    catch(err){
        res.status(500).json({ message: "Error creating order", err: err.message })
    }
}

async function getUserOrders(req, res){
    try{
        const userId = req.user._id

        const orders = await Order.find({
            $or: [{ buyer: userId}, {seller: userId}]
        })
        .populate('service', 'title category')
        .populate('buyer', 'username email')
        .populate('seller', 'username email')

        res.status(200).json({orders})
    }
    catch(err){
        res.status(500).json({ message: 'Error fetching orders', err: err.message})
    }
}

async function updateOrderStatus(req, res){
    try{
        const id = req.params.orderId || req.params.id
        const { status } = req.body
        const userId = req.user._id

        const order = await Order.findById(id)

        if(!order){
            return res.status(404).json({message: 'Order not found'})
        }

        const user = await User.findById(userId)
        if(!user || !user.isSeller){
            return res.status(403).json({ message: 'Only registered sellers can update order status'})
        }

        if(order.seller.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Only the service creator can update this order status'})
        }

        order.status = status
        await order.save()

        res.status(200).json({ message: 'Order status updated', order})
    }
    catch(err){
        res.status(500).json({ message: 'Error updating order status', err: err.message})
    }
}
const getOrderById = async (req, res) => {
    try {
        const id = req.params.orderId || req.params.id
        const order = await Order.findById(id)
            .populate('buyer', 'username email')
            .populate('seller', 'username email')
            .populate('service', 'title category price');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order', error: error.message });
    }
}

module.exports = {
    createOrder,
    getUserOrders,
    updateOrderStatus,
    getOrderById
}