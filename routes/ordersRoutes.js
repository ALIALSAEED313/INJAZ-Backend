const express = require('express')
const router = express.Router()
const {
  createOrder,
  getUserOrders,
  updateOrderStatus,
  authorizeDelivery,
  deliverOrder,
  acceptDelivery,
  requestRevision,
  getOrderById
} = require('../controllers/ordersController')

const verifyToken = require("../middleware/verifyToken")
const requireAgreementAcceptance = require("../middleware/requireAgreementAcceptance")
const { deliveryUpload, uploadToImageKit } = require("../middleware/Upload")

const handleDeliveryFiles = (req, res, next) => {
  deliveryUpload.array("files", 5)(req, res, error => {
    if (error) {
      return res.status(400).json({ message: error.message })
    }
    return next()
  })
}

router.use(verifyToken)
router.post('/', requireAgreementAcceptance, createOrder)
router.get('/my-orders', getUserOrders)
router.post(
  '/:orderId/deliver',
  authorizeDelivery,
  requireAgreementAcceptance,
  handleDeliveryFiles,
  uploadToImageKit,
  deliverOrder
)
router.post('/:orderId/accept-delivery', requireAgreementAcceptance, acceptDelivery)
router.post('/:orderId/request-revision', requireAgreementAcceptance, requestRevision)
router.get('/:orderId', getOrderById)
router.put('/:orderId/status', requireAgreementAcceptance, updateOrderStatus)

module.exports = router
