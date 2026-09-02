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
router.post('/', createOrder)
router.get('/my-orders', getUserOrders)
router.post(
  '/:orderId/deliver',
  authorizeDelivery,
  handleDeliveryFiles,
  uploadToImageKit,
  deliverOrder
)
router.post('/:orderId/accept-delivery', acceptDelivery)
router.post('/:orderId/request-revision', requestRevision)
router.get('/:orderId', getOrderById)
router.put('/:orderId/status', updateOrderStatus)

module.exports = router
