
const router = require('express').Router()

const paymentController = require("../controllers/payment.Controller")
const verifyToken = require("../middleware/verifyToken")

router.post("/:orderId", verifyToken, paymentController.createPayment)
router.get("/verify", verifyToken, paymentController.verifyPayment)


module.exports = router
