const express = require("express");
const router = express.Router();

const paymentDetailsController = require("../controllers/paymentDetails.controller");
const verifyToken = require("../middleware/verifyToken");

router.get("/", verifyToken, paymentDetailsController.getPaymentDetails);
router.post("/", verifyToken, paymentDetailsController.createPaymentDetails);
router.put("/", verifyToken, paymentDetailsController.updatePaymentDetails);
router.delete("/", verifyToken, paymentDetailsController.deletePaymentDetails);

module.exports = router;
