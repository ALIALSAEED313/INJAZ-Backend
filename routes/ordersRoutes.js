const express = require('express')
const router = express.Router()
const {createOrder, getUserOrders, updateOrderStatus, getOrderById} = require('../controllers/ordersController')

const verifyToken = require("../middleware/verifyToken")

router.use(verifyToken)
router.post('/', createOrder)
router.get('/my-orders', getUserOrders)
router.get('/:orderId', getOrderById)
router.put('/:orderId/status', updateOrderStatus)

module.exports = router