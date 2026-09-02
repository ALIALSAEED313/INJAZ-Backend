const Order = require("../models/Order");
const User = require("../models/User");
const Service = require("../models/Services");
const Notification = require("../models/Notification");
const { sendNotificationEmail } = require("../utils/emailService");

const SELLER_TRANSITIONS = {
    Requested: new Set(["Pending", "Cancelled"]),
    Pending: new Set(["In Progress", "Cancelled"]),
    "In Progress": new Set(["Cancelled"]),
};

async function createOrderNotification({
    recipient,
    sender,
    order,
    type,
    title,
    message,
    eventKey,
}) {
    try {
        return await Notification.create({
            recipient,
            sender,
            order,
            type,
            title,
            message,
            eventKey,
        });
    } catch (error) {
        if (error?.code === 11000) {
            return Notification.findOne({ eventKey });
        }
        throw error;
    }
}

async function createOrder(req, res) {
    try {
        const { serviceId } = req.body;
        const buyerId = req.user._id;
        const service = await Service.findById(serviceId).select("freelancer price");

        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }
        if (service.freelancer.toString() === buyerId.toString()) {
            return res.status(400).json({ message: "You cannot order your own service" });
        }

        const newOrder = await Order.create({
            service: serviceId,
            buyer: buyerId,
            seller: service.freelancer,
            price: service.price,
            status: "Requested",
            paymentStatus: "pending",
        });

        return res.status(201).json({
            message: "Order created successfully",
            order: newOrder,
        });
    } catch (err) {
        return res.status(500).json({
            message: "Error creating order",
            err: err.message,
        });
    }
}

async function getUserOrders(req, res) {
    try {
        const orders = await Order.find({
            paymentStatus: "paid",
            $or: [{ buyer: req.user._id }, { seller: req.user._id }],
        })
            .populate("service", "title category")
            .populate("buyer", "username email")
            .populate("seller", "username email")
            .sort({ updatedAt: -1 });

        return res.status(200).json({ orders });
    } catch (err) {
        return res.status(500).json({
            message: "Error fetching orders",
            err: err.message,
        });
    }
}

async function updateOrderStatus(req, res) {
    try {
        const id = req.params.orderId || req.params.id;
        const { status } = req.body;
        const order = await Order.findOne({ _id: id, paymentStatus: "paid" });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Only the order seller can update this status",
            });
        }
        if (!SELLER_TRANSITIONS[order.status]?.has(status)) {
            return res.status(409).json({
                message: `Cannot change order from ${order.status} to ${status}`,
            });
        }

        order.status = status;
        if (status === "Pending") order.acceptedAt = new Date();
        if (status === "In Progress") order.startedAt = new Date();
        await order.save();

        const title = status === "Pending"
            ? "Order accepted"
            : `Order status: ${status}`;
        const message = status === "Pending"
            ? "The seller accepted your order."
            : `The seller updated your order status to "${status}".`;
        const notification = await createOrderNotification({
            recipient: order.buyer,
            sender: req.user._id,
            order: order._id,
            type: "STATUS_CHANGED",
            title,
            message,
            eventKey: `status:${order._id}:${status}:${order.updatedAt.getTime()}`,
        });

        const buyer = await User.findById(order.buyer).select("email username");
        if (buyer?.email && notification) {
            try {
                await sendNotificationEmail({
                    to: buyer.email,
                    subject: title,
                    text: message,
                });
            } catch (emailError) {
                console.error("Email notification failed:", emailError.message);
            }
        }

        return res.status(200).json({ message: "Order status updated", order });
    } catch (err) {
        return res.status(500).json({
            message: "Error updating order status",
            err: err.message,
        });
    }
}

async function authorizeDelivery(req, res, next) {
    try {
        const order = await Order.findOne({
            _id: req.params.orderId,
            paymentStatus: "paid",
        });

        if (!order) {
            return res.status(404).json({ message: "Paid order not found" });
        }
        if (order.seller.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "Only the order seller can deliver work",
            });
        }
        if (!["Pending", "In Progress"].includes(order.status)) {
            return res.status(409).json({
                message: "This order is not ready for delivery",
                order,
            });
        }

        const deliveredAt = order.delivery?.deliveredAt;
        const revisionAt = order.revision?.requestedAt;
        if (deliveredAt && (!revisionAt || revisionAt <= deliveredAt)) {
            return res.status(409).json({
                message: "Work has already been delivered",
                order,
            });
        }

        req.order = order;
        return next();
    } catch (error) {
        return res.status(500).json({
            message: "Unable to authorize delivery",
            error: error.message,
        });
    }
}

async function deliverOrder(req, res) {
    try {
        const files = (req.files || []).map(file => ({
            url: file.url,
            fileId: file.fileId,
            name: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        }));
        const message = String(req.body.message || "").trim();

        if (!files.length) {
            return res.status(400).json({
                message: "At least one delivery file is required",
            });
        }
        if (message.length > 2000) {
            return res.status(400).json({
                message: "Delivery message must be 2000 characters or fewer",
            });
        }

        const deliveredAt = new Date();
        const order = await Order.findOneAndUpdate(
            {
                _id: req.order._id,
                seller: req.user._id,
                paymentStatus: "paid",
                status: { $in: ["Pending", "In Progress"] },
            },
            {
                $set: {
                    status: "Delivered",
                    delivery: { message, files, deliveredAt },
                },
            },
            { new: true, runValidators: true },
        );

        if (!order) {
            return res.status(409).json({
                message: "The order was already delivered or changed",
            });
        }

        await createOrderNotification({
            recipient: order.buyer,
            sender: order.seller,
            order: order._id,
            type: "DELIVERY_SUBMITTED",
            title: "Your order has been delivered",
            message: "The seller submitted the completed work. Review it in your workspace.",
            eventKey: `delivery:${order._id}:${deliveredAt.getTime()}`,
        });

        return res.status(200).json({
            message: "Work delivered successfully",
            order,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to deliver work",
            error: error.message,
        });
    }
}

async function acceptDelivery(req, res) {
    try {
        const existingOrder = await Order.findOne({
            _id: req.params.orderId,
            paymentStatus: "paid",
        });
        if (!existingOrder) {
            return res.status(404).json({ message: "Paid order not found" });
        }
        if (existingOrder.buyer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the buyer can accept delivery" });
        }
        if (existingOrder.status !== "Delivered" || !existingOrder.delivery?.deliveredAt) {
            return res.status(409).json({ message: "This order has not been delivered" });
        }

        const completedAt = new Date();
        const order = await Order.findOneAndUpdate(
            {
                _id: req.params.orderId,
                buyer: req.user._id,
                paymentStatus: "paid",
                status: "Delivered",
                "delivery.deliveredAt": { $exists: true },
            },
            {
                $set: {
                    status: "Completed",
                    completedAt,
                },
            },
            { new: true, runValidators: true },
        );

        if (!order) {
            return res.status(409).json({
                message: "Only the buyer can accept a delivered order",
            });
        }

        await createOrderNotification({
            recipient: order.seller,
            sender: order.buyer,
            order: order._id,
            type: "DELIVERY_ACCEPTED",
            title: "Delivery accepted",
            message: "The buyer accepted your delivery and completed the order.",
            eventKey: `accepted:${order._id}`,
        });

        return res.status(200).json({
            message: "Delivery accepted",
            order,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to accept delivery",
            error: error.message,
        });
    }
}

async function requestRevision(req, res) {
    try {
        const message = String(req.body.message || "").trim();
        if (!message || message.length > 1000) {
            return res.status(400).json({
                message: "A revision message between 1 and 1000 characters is required",
            });
        }

        const existingOrder = await Order.findOne({
            _id: req.params.orderId,
            paymentStatus: "paid",
        });
        if (!existingOrder) {
            return res.status(404).json({ message: "Paid order not found" });
        }
        if (existingOrder.buyer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Only the buyer can request a revision" });
        }
        if (existingOrder.status !== "Delivered") {
            return res.status(409).json({ message: "This order is not awaiting buyer review" });
        }

        const requestedAt = new Date();
        const order = await Order.findOneAndUpdate(
            {
                _id: req.params.orderId,
                buyer: req.user._id,
                paymentStatus: "paid",
                status: "Delivered",
            },
            {
                $set: {
                    status: "In Progress",
                    revision: { message, requestedAt },
                    startedAt: requestedAt,
                },
            },
            { new: true, runValidators: true },
        );

        if (!order) {
            return res.status(409).json({
                message: "Only the buyer can request a revision for delivered work",
            });
        }

        await createOrderNotification({
            recipient: order.seller,
            sender: order.buyer,
            order: order._id,
            type: "REVISION_REQUESTED",
            title: "Revision requested",
            message,
            eventKey: `revision:${order._id}:${requestedAt.getTime()}`,
        });

        return res.status(200).json({
            message: "Revision requested",
            order,
        });
    } catch (error) {
        return res.status(500).json({
            message: "Unable to request revision",
            error: error.message,
        });
    }
}

async function getOrderById(req, res) {
    try {
        const order = await Order.findOne({
            _id: req.params.orderId || req.params.id,
            paymentStatus: "paid",
            $or: [{ buyer: req.user._id }, { seller: req.user._id }],
        })
            .populate("buyer", "username email")
            .populate("seller", "username email")
            .populate("service", "title category price");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching order",
            error: error.message,
        });
    }
}

module.exports = {
    createOrder,
    getUserOrders,
    updateOrderStatus,
    authorizeDelivery,
    deliverOrder,
    acceptDelivery,
    requestRevision,
    getOrderById,
};
