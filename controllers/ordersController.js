const Order = require("../models/Order");
const User = require("../models/User");
const Service = require("../models/Services");

async function createOrder(req, res) {
    try {
        const { serviceId } = req.body;
        const buyerId = req.user._id;

        const service = await Service.findById(serviceId).select("freelancer price");
        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }

        const newOrder = await Order.create({
            service: serviceId,
            buyer: buyerId,
            seller: service.freelancer,
            price: service.price,
            status: "Requested",
            paymentStatus: "pending",
        });

        res
            .status(201)
            .json({ message: "Order created successfully", order: newOrder });
    } catch (err) {
        res.status(500).json({ message: "Error creating order", err: err.message });
    }
}

async function getUserOrders(req, res) {
    try {
        const userId = req.user._id;

        const orders = await Order.find({
            paymentStatus: "paid",
            $or: [{ buyer: userId }, { seller: userId }],
        })
            .populate("service", "title category")
            .populate("buyer", "username email")
            .populate("seller", "username email");

        res.status(200).json({ orders });
    } catch (err) {
        res
            .status(500)
            .json({ message: "Error fetching orders", err: err.message });
    }
}

async function updateOrderStatus(req, res) {
    try {
        const id = req.params.orderId || req.params.id;
        const { status } = req.body;
        const userId = req.user._id;

        const order = await Order.findOne({ _id: id, paymentStatus: "paid" });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const user = await User.findById(userId);
        if (!user || !user.isSeller) {
            return res
                .status(403)
                .json({ message: "Only registered sellers can update order status" });
        }

        if (order.seller.toString() !== userId.toString()) {
            return res
                .status(403)
                .json({
                    message: "Only the service creator can update this order status",
                });
        }

        order.status = status;
        await order.save();

        const titleText =
            status === "Pending" ? "Order Accepted!" : `Order Status: ${status}`;
        const messageText =
            status === "Pending"
                ? "The seller accepted your order request!"
                : `The seller updated your order status to "${status}".`;

        const notification = await Notification.create({
            recipient: order.buyer,
            sender: userId,
            type: "STATUS_CHANGED",
            title: titleText,
            message: messageText,
            order: order._id,
        });

        const buyer = await User.findById(order.buyer).select("email username");
        if (buyer?.email) {
            try {
                await sendNotificationEmail({
                    to: buyer.email,
                    subject: notification.title,
                    text: notification.message,
                    html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; max-width: 600px; margin: auto;">
              <h2 style="color: #1ba84c;">Order Status Update 📦</h2>
              <p>Hi <strong>${buyer.username}</strong>,</p>
              <p>There is an update regarding your recent order on INJAZ.</p>
              <p style="padding: 15px; background-color: #f9f9f9; border-left: 4px solid #1ba84c; font-size: 16px;">
                <strong>Status:</strong> ${messageText}
              </p>
              <a href="http://localhost:5173/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #1ba84c; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold;">Check Your Dashboard</a>
            </div>
          `,
                });
            } catch (emailError) {
                console.error("Email notification failed:", emailError.message);
            }
        }

        res.status(200).json({ message: "Order status updated", order });
    } catch (err) {
        res
            .status(500)
            .json({ message: "Error updating order status", err: err.message });
    }
}
const getOrderById = async (req, res) => {
    try {
        const id = req.params.orderId || req.params.id;
        const order = await Order.findOne({
            _id: id,
            paymentStatus: "paid",
            $or: [{ buyer: req.user._id }, { seller: req.user._id }],
        })
            .populate("buyer", "username email")
            .populate("seller", "username email")
            .populate("service", "title category price");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        res.status(200).json(order);
    } catch (error) {
        res
            .status(500)
            .json({ message: "Error fetching order", error: error.message });
    }
};

module.exports = {
    createOrder,
    getUserOrders,
    updateOrderStatus,
    getOrderById,
};
