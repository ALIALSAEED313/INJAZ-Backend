const Order = require("../models/Order")

const createPayment = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            })
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
                    first_name: req.user.username || "Test",
                    email: req.user.email || "test@example.com",
                },

                source: {
                    id: "src_all",
                },

                redirect: {
                    url: "http://localhost:5173/payment/callback",
                },

                metadata: {
                    orderId: order._id.toString(),
                },
            }),
        })

        const payment = await response.json()

        console.log(payment)

        if (!response.ok) {
            return res.status(400).json({
                message: "Tap payment creation failed",
                error: payment,
            })
        }

        order.tapChargeId = payment.id
        await order.save()

        return res.status(200).json({
            paymentUrl: payment.transaction?.url,
            chargeId: payment.id,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            message: "Payment failed",
        })
    }
}

const verifyPayment = async (req, res) => {
    try {
        const { tap_id } = req.query

        if (!tap_id) {
            return res.status(400).json({
                message: "Missing Tap charge id",
            })
        }

        const response = await fetch(
            `https://api.tap.company/v2/charges/${tap_id}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${process.env.TAP_SECRET_KEY}`,
                },
            }
        )

        const payment = await response.json()

        console.log("TAP VERIFY STATUS:", payment.status)
        console.log("TAP VERIFY RESPONSE:", payment.response)
        console.log("TAP VERIFY FULL:", payment)

        if (!response.ok) {
            return res.status(400).json({
                message: "Unable to verify payment",
                error: payment,
            })
        }

        const orderId = payment.metadata?.orderId

        const order = await Order.findById(orderId)

        if (!order) {
            return res.status(404).json({
                message: "Order not found",
            })
        }

        if (payment.status === "CAPTURED") {
            order.paymentStatus = "paid"
        } else {
            order.paymentStatus = "failed"
        }

        order.tapChargeId = payment.id

        await order.save()

        return res.status(200).json({
            message:
                payment.status === "CAPTURED"
                    ? "Payment successful"
                    : "Payment failed",

            paymentStatus: order.paymentStatus,
            tapStatus: payment.status,
            order,
        })
    } catch (error) {
        console.error(error)

        return res.status(500).json({
            message: "Payment verification failed",
        })
    }
}

module.exports = {
    createPayment,
    verifyPayment
}