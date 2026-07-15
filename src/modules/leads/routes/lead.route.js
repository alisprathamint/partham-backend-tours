import express from 'express';
import * as leadController from '../controllers/lead.controller.js';
import { verifyToken } from '../../../middlewares/auth.js';

const router = express.Router();

router.get('/leads', verifyToken, leadController.getLeads);
router.post('/leads', verifyToken, leadController.addLead);
router.put('/leads/bulk-assign', verifyToken, leadController.bulkAssign);
router.put('/leads/:id', verifyToken, leadController.updateLead);
router.delete('/leads/:id', verifyToken, leadController.deleteLead);
router.post('/leads/:id/convert', verifyToken, leadController.convertLead);
router.post('/leads/:id/notes', verifyToken, leadController.addNote);
router.post('/leads/:id/tasks', verifyToken, leadController.addTask);
router.post('/leads/:id/follow-up', verifyToken, leadController.handleFollowUp);

router.get('/tasks/upcoming', verifyToken, leadController.getUpcomingTasks);
router.put('/tasks/:taskId/complete', verifyToken, leadController.completeTask);
router.put('/tasks/:taskId/snooze', verifyToken, leadController.snoozeTask);
router.put('/tasks/:taskId/reschedule', verifyToken, leadController.rescheduleTask);

export default router;
