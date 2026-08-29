const express = require("express")
const router = express.Router()

const reviewController = require("../controllers/review.controller")
const verifyToken = require("../middleware/verifyToken")


router.post("/order/:orderId", verifyToken, reviewController.createReview)


router.get("/service/:serviceId", reviewController.getServiceReviews)

router.get("/profile/:userId", reviewController.getReviewsForSeller)


router.put("/:reviewId", verifyToken, reviewController.updateReview)


router.delete("/:reviewId", verifyToken, reviewController.deleteReview)

module.exports = router