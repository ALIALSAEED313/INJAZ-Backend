const router = require("express").Router()

const adminController = require("../controllers/admin.controller")
const verifyToken = require("../middleware/verifyToken")
const isAdmin = require("../middleware/isAdmin")

router.get("/stats", verifyToken, isAdmin, adminController.getStats)

router.get("/users", verifyToken, isAdmin, adminController.getUsers)

router.get("/services", verifyToken, isAdmin, adminController.getServices)

router.get("/orders", verifyToken, isAdmin, adminController.getOrders)

router.get("/reviews", verifyToken, isAdmin, adminController.getReviews)

router.put('/users/:userId/role', verifyToken, isAdmin, adminController.updateUserRole)

router.delete("/users/:userId", verifyToken, isAdmin, adminController.deleteUser)

router.delete("/services/:serviceId", verifyToken, isAdmin, adminController.deleteService)

router.delete("/orders/:orderId", verifyToken, isAdmin, adminController.deleteOrder)

router.delete("/reviews/:reviewId", verifyToken, isAdmin, adminController.deleteReview)

module.exports = router