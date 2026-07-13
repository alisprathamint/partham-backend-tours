import express from 'express';
import * as destinationController from '../controllers/destination.controller.js';
import { verifyToken, isAdmin } from '../../../middlewares/auth.js';

const router = express.Router();

router.get("/destinations", destinationController.getDestinations);
router.get("/destinations/:id", destinationController.getDestinationById);
router.get("/destinations/month/:month", destinationController.getDestinationsByMonth);
router.post("/destinations", [verifyToken, isAdmin], destinationController.createDestination);
router.put("/destinations/:id", [verifyToken, isAdmin], destinationController.updateDestination);
router.delete("/destinations/:id", [verifyToken, isAdmin], destinationController.deleteDestination);
router.get("/destinations/:destinationName/packages", destinationController.getPackagesByDestinationName);

export default router;
