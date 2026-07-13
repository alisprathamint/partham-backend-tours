import express from 'express';
import * as paymentController from '../controllers/payment.controller.js';

const router = express.Router();

router.post("/create-order", paymentController.createOrder);
router.get("/verify-payment/:orderId", paymentController.verifyPayment);
router.post("/save-booking", paymentController.saveBooking);
router.post("/send-receipt", paymentController.sendReceipt);
router.post("/generate-receipt", paymentController.generateReceipt);
router.get("/ha", paymentController.getRunningCheck);

export default router;
