const Order = require("../models/Order")
const Notification = require("../models/Notification")
const User = require("../models/User")
const { sendNotificationEmail } = require("../utils/emailService")

const TAP_CAPTURED_STATUS = "CAPTURED"
const TAP_FINAL_FAILURE_STATUSES = new Set([
    "FAILED", "DECLINED", "CANCELLED", "CANCELED", "ABANDONED",
    "EXPIRED", "RESTRICTED", "VOID", "TIMEDOUT", "UNKNOWN",
])

async function notifySellerOfPaidOrder(order) {
    let notification
    try {
        notification = await Notification.create({
            recipient: order.seller,
            sender: order.buyer,
            type: "ORDER_REQUESTED",
            title: "New Order Requested!",
            message: "A buyer has requested your service. Please accept the order to proceed.",
            order: order._id,
        })
    } catch (error) {
        // The unique order/type index makes callback and refresh retries idempotent.
        if (error?.code === 11000) return
        throw error
    }

    const seller = await User.findById(order.seller).select("email username")
    if (!seller?.email) return

    try {
        await sendNotificationEmail({
            to: seller.email,
            subject: notification.title,
            text: notification.message,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; max-width: 600px; margin: auto;">
                  <h2 style="color: #1ba84c;">New Order Request! 🎉</h2>
                  <p>Hi <strong>${seller.username}</strong>,</p>
                  <p>Great news! A buyer just requested your service on INJAZ.</p>
                  <p style="padding: 15px; background-color: #f9f9f9; border-left: 4px solid #1ba84c;"><strong>Message:</strong> ${notification.message}</p>
                  <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #1ba84c; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; font-weight: bold;">View Order Dashboard</a>
                </div>
            `,
        })
    } catch (emailError) {
        console.error("Email notification failed:", emailError.message)
    }
}

const createPayment = async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.orderId,
            buyer: req.user._id,
            paymentStatus: { $ne: "paid" },
        })

        if (!order) {
            return res.status(404).json({ message: "Unpaid order not found" })
        }

        const response = await fetch("https://api.tap.company/v2/charges/", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                amount: order.price,
                currency: "BHD",
                customer: {
                    first_name: req.user.username || "Customer",
                    email: req.user.email || "customer@example.com",
                },
                source: { id: "src_all" },
                redirect: {
                    url: `${process.env.CLIENT_URL || "http://localhost:5173"}/payment/callback`,
                },
                metadata: { orderId: order._id.toString() },
            }),
        })

        const payment = await response.json()
        if (!response.ok || !payment.id || !payment.transaction?.url) {
            return res.status(400).json({
                message: "Tap payment creation failed",
                error: payment,
            })
        }

        order.tapChargeId = payment.id
        order.paymentStatus = "pending"
        await order.save()

        return res.status(200).json({
            paymentUrl: payment.transaction.url,
            chargeId: payment.id,
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Payment failed" })
    }
}

const verifyPayment = async (req, res) => {
    try {
        const { tap_id: tapId } = req.query
        if (!tapId) {
            return res.status(400).json({ message: "Missing Tap charge id" })
        }

        const response = await fetch(`https://api.tap.company/v2/charges/${encodeURIComponent(tapId)}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${process.env.TAP_SECRET_KEY}` },
        })
        const payment = await response.json()

        if (!response.ok) {
            return res.status(400).json({
                message: "Unable to verify payment",
                error: payment,
            })
        }

        const orderId = payment.metadata?.orderId
        const order = orderId
            ? await Order.findOne({ _id: orderId, buyer: req.user._id })
            : null

        if (!order || order.tapChargeId !== tapId || payment.id !== tapId) {
            return res.status(404).json({ message: "Payment attempt not found" })
        }

        const tapStatus = String(payment.status || "").toUpperCase()
        const amountMatches = Number(payment.amount) === Number(order.price)
        const currencyMatches = String(payment.currency || "").toUpperCase() === "BHD"

        if (tapStatus === TAP_CAPTURED_STATUS && amountMatches && currencyMatches) {
            const activatedOrder = await Order.findOneAndUpdate(
                {
                    _id: order._id,
                    tapChargeId: tapId,
                    paymentStatus: { $ne: "paid" },
                },
                { $set: { paymentStatus: "paid" } },
                { new: true, runValidators: true },
            )

            const paidOrder = activatedOrder || await Order.findOne({
                _id: order._id,
                tapChargeId: tapId,
                paymentStatus: "paid",
            })

            if (!paidOrder) {
                return res.status(409).json({ message: "Payment could not be finalized" })
            }

            await notifySellerOfPaidOrder(paidOrder)

            return res.status(200).json({
                message: "Payment successful",
                paymentStatus: "paid",
                tapStatus,
                order: paidOrder,
            })
        }

        const isFinalFailure =
            tapStatus === TAP_CAPTURED_STATUS || TAP_FINAL_FAILURE_STATUSES.has(tapStatus)

        if (isFinalFailure) {
            await Order.updateOne(
                { _id: order._id, paymentStatus: { $ne: "paid" } },
                { $set: { paymentStatus: "failed" } },
            )
        }

        const paymentStatus = isFinalFailure ? "failed" : "pending"
        return res.status(200).json({
            message: paymentStatus === "pending" ? "Payment pending" : "Payment failed",
            paymentStatus,
            tapStatus,
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Payment verification failed" })
    }
}

module.exports = { createPayment, verifyPayment }
