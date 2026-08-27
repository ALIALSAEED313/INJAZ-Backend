const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const {
    getUserNotifications,
    markAsRead,
    markAllAsRead
} = require('../controllers/notification.controller');

router.use(verifyToken);
router.get('/', getUserNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

module.exports = router;
