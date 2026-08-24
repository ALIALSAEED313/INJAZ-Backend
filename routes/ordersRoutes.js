const express = require('express')
const router = express.Router()
const {createOrder, getUserOrders, updateOrderStatus} = require('../controllers/ordersController')



router.post('/', createOrder)
router.get('/my-orders', getUserOrders)
router.put('/:id/status', updateOrderStatus)

module.exports = router