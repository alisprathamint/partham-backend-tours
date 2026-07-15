import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { verifyToken, isAdmin, isManagerOrAdmin } from '../../../middlewares/auth.js';

const router = express.Router();

// Login route (Public)
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', verifyToken, authController.logout);

// Session check & SSE stream
router.get('/check-session', verifyToken, (req, res) => res.json({ success: true }));
router.get('/session-stream', verifyToken, authController.sessionStream);

// Create new user
router.post('/register', [verifyToken, isManagerOrAdmin], authController.register);

// Get all users
router.get('/users', [verifyToken, isManagerOrAdmin], authController.getUsers);

// Delete user
router.delete('/users/:id', [verifyToken, isManagerOrAdmin], authController.deleteUser);

// Update user (profile / password reset / role / branch changes)
router.put('/users/:id', [verifyToken, isManagerOrAdmin], authController.updateUser);

// Update profile (own)
router.put('/profile', verifyToken, authController.updateProfile);

export default router;
