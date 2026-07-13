import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';

const router = express.Router();

router.post("/submit-booking-request", bookingController.submitBookingRequestLegacy);
router.post("/booking-requests", bookingController.createBookingRequest);

export default router;
