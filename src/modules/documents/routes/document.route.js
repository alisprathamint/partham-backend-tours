import express from 'express';
import { verifyToken } from '../../../middlewares/auth.js';
import { upload } from '../../../config/multer.js';
import * as docController from '../controllers/document.controller.js';

const router = express.Router();

// Customer document routes
router.get('/leads/:leadId/documents', verifyToken, docController.getDocuments);
router.post(
  '/leads/:leadId/documents',
  verifyToken,
  upload.single('file'),
  docController.uploadDocument
);
router.get('/documents/:id', verifyToken, docController.getDocument);
router.put(
  '/documents/:id',
  verifyToken,
  upload.single('file'),
  docController.replaceDocument
);
router.delete('/documents/:id', verifyToken, docController.deleteDocument);

export default router;
