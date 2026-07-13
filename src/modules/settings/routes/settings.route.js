import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { verifyToken, isAdmin } from '../../../middlewares/auth.js';

const router = express.Router();

router.get('/settings', settingsController.getSettings);
router.post('/settings', [verifyToken, isAdmin], settingsController.updateSettings);

export default router;
