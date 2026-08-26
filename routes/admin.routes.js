const router = require("express").Router()

const adminController = require("../controllers/admin.controller")
const verifyToken = require("../middleware/verifyToken")
const isAdmin = require("../middleware/isAdmin")

router.get("/stats", verifyToken, isAdmin, adminController.getStats)

router.delete("/users/:userId", verifyToken, isAdmin, adminController.deleteUser)

router.delete("/services/:serviceId", verifyToken, isAdmin, adminController.deleteService)

router.delete("/orders/:orderId", verifyToken, isAdmin, adminController.deleteOrder)

router.delete("/reviews/:reviewId", verifyToken, isAdmin, adminController.deleteReview)

module.exports = router