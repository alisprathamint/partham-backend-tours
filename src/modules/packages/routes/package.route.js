import express from 'express';
import multer from 'multer';
import * as packageController from '../controllers/package.controller.js';
import { verifyToken, isAdmin } from '../../../middlewares/auth.js';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = express.Router();

router.get("/packages", packageController.getPackages);
router.get("/packages/:identifier", packageController.getPackageByIdentifier);
router.post("/packages", [verifyToken, isAdmin], packageController.createPackage);
router.put("/packages/:id", [verifyToken, isAdmin], packageController.updatePackage);
router.post("/submit-custom-package", packageController.submitCustomPackage);
router.get("/custom-package-requests", verifyToken, packageController.getCustomPackageRequests);
router.put("/custom-package-requests/:id", [verifyToken, isAdmin], packageController.updateCustomPackageRequestStatus);
router.post("/packages/extract-from-pdf", [verifyToken, isAdmin, upload.single("file")], packageController.extractFromPdf);

export default router;
