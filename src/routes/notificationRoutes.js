import express from 'express';
import { getNotifications, markAllAsRead, markAsRead } from '../controllers/notificationController.js';
import { verifyToken } from '../middlewares/auth.js';

const router = express.Router();

// All notification routes require authentication
router.use(verifyToken);

router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);

export default router;
