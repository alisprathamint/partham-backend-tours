import express from 'express';
import { upload } from '../../../config/multer.js';
import * as uploadController from '../controllers/upload.controller.js';

const router = express.Router();

router.post(
  "/upload-package-files",
  upload.fields([
    { name: "cardImage", maxCount: 1 },
    { name: "detailImage", maxCount: 1 },
    { name: "destinationImage", maxCount: 1 },
    { name: "brochure", maxCount: 1 },
  ]),
  uploadController.uploadPackageFiles
);

router.post("/upload", upload.single("file"), uploadController.uploadSingleFile);
router.post("/upload-multiple", upload.array("files", 10), uploadController.uploadMultipleFiles);
router.get("/files", uploadController.getFiles);
router.delete("/files/:filename", uploadController.deleteFile);

export default router;
