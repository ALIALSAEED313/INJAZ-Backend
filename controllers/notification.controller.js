const Notification = require('../models/Notification');

async function getUserNotifications(req, res) {
    try {
        const userId = req.user._id;

        const notifications = await Notification.find({ recipient: userId })
            .populate('sender', 'username avatarUrl')
            .populate({
                path: 'order',
                match: { paymentStatus: 'paid' },
                select: 'status service price paymentStatus'
            })
            .sort({ createdAt: -1 });

        const visibleNotifications = notifications.filter(notification =>
            !['ORDER_REQUESTED', 'ORDER_CREATED', 'STATUS_CHANGED'].includes(notification.type) ||
            notification.order
        );

        const unread = visibleNotifications.filter(n => !n.isRead);
        const read = visibleNotifications.filter(n => n.isRead);

        res.status(200).json({ unread, read, totalUnread: unread.length });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching notifications', error: err.message });
    }
}

async function markAsRead(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.status(200).json({ message: 'Notification marked as read', notification });
    } catch (err) {
        res.status(500).json({ message: 'Error updating notification', error: err.message });
    }
}

async function markAllAsRead(req, res) {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating notifications', error: err.message });
    }
}

module.exports = {
    getUserNotifications,
    markAsRead,
    markAllAsRead
};
