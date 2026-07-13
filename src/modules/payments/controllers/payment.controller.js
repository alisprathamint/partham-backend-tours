import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { transporter, emailsSent } from '../../../config/email.js';
import { uploadsDir } from '../../../config/multer.js';
import { generatePDF } from '../../../utils/pdf.js';
import {
  generateReceiptHTML,
  generateReceiptEmailHTML,
  generateAdminReceiptEmailHTML
} from '../../../utils/emailTemplates.js';
import * as paymentService from '../services/payment.service.js';

const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg";

async function saveBookingToDatabase(orderData, bookingDetails, packageDetails) {
  try {
    console.log("Starting database transaction for booking:", orderData.order_id);

    const existingOrdersCheck = await paymentService.findBookingByOrderId(orderData.order_id);

    if (existingOrdersCheck) {
      console.log(
        `Order ${orderData.order_id} already exists in database with ID ${existingOrdersCheck._id}, skipping insertion`,
      );
      return {
        alreadyExists: true,
        bookingId: existingOrdersCheck.id.toString(),
      };
    }

    console.log("Inserting new booking into database:", {
      orderId: orderData.order_id,
      customerName: bookingDetails.fullName,
      packageName: packageDetails.name,
    });

    const savedBooking = await paymentService.createBooking({
      order_id: orderData.order_id,
      customer_name: bookingDetails.fullName,
      customer_email: bookingDetails.email,
      customer_phone: bookingDetails.phone,
      customer_gender: bookingDetails.gender || null,
      customer_age: bookingDetails.age ? parseInt(bookingDetails.age) : null,
      travel_date: new Date(bookingDetails.travelDate),
      num_travelers: parseInt(bookingDetails.travelers),
      package_id: packageDetails.id ? String(packageDetails.id) : packageDetails._id ? String(packageDetails._id) : null,
      package_name: packageDetails.name,
      package_location: packageDetails.location,
      package_duration: packageDetails.duration,
      package_price: packageDetails.price ? String(packageDetails.price) : null,
      total_price: parseFloat(orderData.order_amount),
      payment_status: "completed",
      transaction_id: orderData.order_id,
      booking_date: new Date(),
      status: "confirmed",
      special_requests: bookingDetails.specialRequests || null,
    });

    const bookingId = savedBooking.id.toString();
    console.log(`Booking inserted with ID: ${bookingId}`);

    return { success: true, bookingId };
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  }
}

const sendReceiptEmail = async (to, subject, orderData, bookingDetails, packageDetails, pdfBase64 = null) => {
  try {
    const emailKey = `${to}_${orderData.order_id}`;
    if (emailsSent.has(emailKey)) {
      console.log(`Email already sent to ${to} for order ${orderData.order_id}, skipping duplicate`);
      return { success: true, message: "Receipt email already sent" };
    }

    emailsSent.add(emailKey);
    console.log("Sending receipt email to:", to);

    const htmlContent = generateReceiptHTML(orderData, bookingDetails, packageDetails);
    const attachments = [];

    if (pdfBase64) {
      console.log("Attaching client-supplied Base64 PDF receipt to email");
      attachments.push({
        filename: `Pratham Tours_Receipt_${orderData.order_id}.pdf`,
        content: pdfBase64,
        encoding: "base64",
        contentType: "application/pdf",
      });
    } else if (process.env.VERCEL !== "1") {
      try {
        const pdfFilePath = path.join(
          uploadsDir,
          `receipt_${orderData.order_id}_${to.replace(/[^a-zA-Z0-9]/g, "")}.pdf`,
        );

        await generatePDF(htmlContent, pdfFilePath);
        
        if (fs.existsSync(pdfFilePath)) {
          attachments.push({
            filename: `Pratham Tours_Receipt_${orderData.order_id}.pdf`,
            path: pdfFilePath,
            contentType: "application/pdf",
          });
        }
      } catch (pdfError) {
        console.error("PDF generation failed, sending email without attachment:", pdfError.message);
      }
    }

    const mailOptions = {
      from: `"Pratham Tours Travel" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: generateReceiptEmailHTML(orderData, bookingDetails, packageDetails, attachments.length),
      attachments: attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);

    return { success: true, message: "Receipt email sent successfully" };
  } catch (error) {
    console.error("Error sending receipt email:", error);
    const emailKey = `${to}_${orderData.order_id}`;
    emailsSent.delete(emailKey);
    return {
      success: false,
      message: "Failed to send receipt email",
      error: error.message,
    };
  }
};

const sendBookingConfirmationAdminEmail = async (orderData, bookingDetails, packageDetails, pdfBase64 = null) => {
  try {
    const adminEmailKey = `admin_confirm_${orderData.order_id}`;
    if (emailsSent.has(adminEmailKey)) {
      console.log(`Admin booking confirmation email already sent for order ${orderData.order_id}, skipping duplicate`);
      return { success: true };
    }

    emailsSent.add(adminEmailKey);
    console.log("Sending booking confirmation email to admin (booking.pratham-tours@gmail.com)");

    let travelersList = `1. ${bookingDetails.fullName} (Lead Traveler)`;
    if (bookingDetails.additionalTravelers && bookingDetails.additionalTravelers.length > 0) {
      bookingDetails.additionalTravelers.forEach((traveler, index) => {
        const name = traveler.fullName || traveler.name || `Traveler ${index + 2}`;
        travelersList += `\n${index + 2}. ${name}`;
      });
    }

    const attachments = [];
    if (pdfBase64) {
      attachments.push({
        filename: `Pratham Tours_Receipt_${orderData.order_id}.pdf`,
        content: pdfBase64,
        encoding: "base64",
        contentType: "application/pdf",
      });
    }

    const adminMailOptions = {
      from: `"Pratham Tours Travel" <${process.env.EMAIL_USER}>`,
      to: "booking.pratham-tours@gmail.com",
      subject: `New Confirmed Booking (Paid) - ${packageDetails.name} | Pratham Tours`,
      html: generateAdminReceiptEmailHTML(orderData, bookingDetails, packageDetails, travelersList),
      attachments: attachments,
    };

    await transporter.sendMail(adminMailOptions);
    console.log("Admin notification for confirmed booking sent successfully");
    return { success: true };
  } catch (error) {
    console.error("Error sending admin confirmed booking email:", error);
    const adminEmailKey = `admin_confirm_${orderData.order_id}`;
    emailsSent.delete(adminEmailKey);
    return { success: false, error: error.message };
  }
};

export const createOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", customerDetails } = req.body;

    const orderId = "order_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    const request = {
      order_id: orderId,
      order_amount: Number.parseFloat(amount),
      order_currency: currency,
      customer_details: {
        customer_id: customerDetails.customer_id || "customer_" + Date.now(),
        customer_name: customerDetails.customer_name,
        customer_email: customerDetails.customer_email,
        customer_phone: customerDetails.customer_phone,
      },
      order_meta: {
        return_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/payment-status?order_id=${orderId}`,
      },
    };

    const response = await axios.post(`${CASHFREE_BASE_URL}/orders`, request, {
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        "Content-Type": "application/json",
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error creating order:", error.response ? error.response.data : error.message);
    res.status(500).json({
      error: "Failed to create order",
      message: error.response ? error.response.data : error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const response = await axios.get(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
      },
    });

    const paymentStatus = response.data.order_status;

    res.json({
      order_id: orderId,
      status: paymentStatus,
      message: paymentStatus === "PAID" ? "Payment successful" : "Payment failed",
      data: response.data,
    });
  } catch (error) {
    console.error("Error verifying payment:", error.response ? error.response.data : error.message);
    res.status(500).json({
      error: "Failed to verify payment",
      message: error.response ? error.response.data : error.message,
    });
  }
};

export const saveBooking = async (req, res) => {
  try {
    const { orderData, bookingDetails, packageDetails } = req.body;

    console.log("Received booking save request:", {
      orderId: orderData?.order_id,
      hasBookingDetails: !!bookingDetails,
      hasPackageDetails: !!packageDetails,
    });

    if (!orderData || !bookingDetails || !packageDetails) {
      return res.status(400).json({
        success: false,
        message: "Missing required data for saving booking",
      });
    }

    if (!orderData.order_id) {
      return res.status(400).json({
        success: false,
        message: "Missing order_id in orderData",
      });
    }

    if (!bookingDetails.fullName || !bookingDetails.email || !bookingDetails.phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required customer details (name, email, phone)",
      });
    }

    if (!packageDetails.name || !packageDetails.location || !packageDetails.price) {
      return res.status(400).json({
        success: false,
        message: "Missing required package details",
      });
    }

    const result = await saveBookingToDatabase(orderData, bookingDetails, packageDetails);

    if (result.alreadyExists) {
      return res.json({
        success: true,
        message: "Booking already exists in database",
        bookingId: result.bookingId,
        alreadyExists: true,
      });
    }

    res.json({
      success: true,
      message: "Booking saved successfully",
      bookingId: result.bookingId,
    });
  } catch (error) {
    console.error("Error saving booking:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save booking",
      error: error.message,
    });
  }
};

export const sendReceipt = async (req, res) => {
  try {
    const { orderData, bookingDetails, packageDetails, pdfBase64 } = req.body;

    if (!orderData || !bookingDetails || !packageDetails) {
      return res.status(400).json({
        success: false,
        message: "Missing required data for receipt generation",
      });
    }

    const emailKey = `${bookingDetails.email}_${orderData.order_id}`;
    if (emailsSent.has(emailKey)) {
      console.log(`Email already sent to ${bookingDetails.email} for order ${orderData.order_id}, skipping duplicate`);
      return res.json({
        success: true,
        message: "Receipt email already sent",
      });
    }

    const result = await sendReceiptEmail(
      bookingDetails.email,
      "Your Pratham Tours Booking Receipt",
      orderData,
      bookingDetails,
      packageDetails,
      pdfBase64,
    );

    try {
      await sendBookingConfirmationAdminEmail(orderData, bookingDetails, packageDetails, pdfBase64);
    } catch (err) {
      console.error("Error sending admin notification email:", err);
    }

    res.json(result);
  } catch (error) {
    console.error("Error sending receipt:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send receipt email",
      error: error.message,
    });
  }
};

export const generateReceipt = async (req, res) => {
  try {
    if (process.env.VERCEL === "1") {
      return res.status(400).json({
        success: false,
        message: "PDF generation not available on Vercel. Please use localhost for this feature.",
      });
    }

    let orderData, bookingDetails, packageDetails;

    try {
      orderData = typeof req.body.orderData === "string" ? JSON.parse(req.body.orderData) : req.body.orderData;
      bookingDetails = typeof req.body.bookingDetails === "string" ? JSON.parse(req.body.bookingDetails) : req.body.bookingDetails;
      packageDetails = typeof req.body.packageDetails === "string" ? JSON.parse(req.body.packageDetails) : req.body.packageDetails;
    } catch (parseError) {
      console.error("Error parsing request data:", parseError);
      return res.status(400).json({
        success: false,
        message: "Invalid request data format",
        error: parseError.message,
      });
    }

    if (!orderData || !bookingDetails || !packageDetails) {
      return res.status(400).json({
        success: false,
        message: "Missing required data for receipt generation",
      });
    }

    const orderId = orderData?.order_id || `receipt_${Date.now()}`;
    const uniqueId = Date.now().toString().slice(-4);
    const pdfFilePath = path.join(uploadsDir, `receipt_${orderId}_${uniqueId}.pdf`);

    console.log("Generating receipt PDF for order:", orderId);

    const htmlContent = generateReceiptHTML(orderData, bookingDetails, packageDetails);

    await generatePDF(htmlContent, pdfFilePath);

    if (!fs.existsSync(pdfFilePath)) {
      throw new Error(`PDF file not found at ${pdfFilePath}`);
    }

    const fileData = fs.readFileSync(pdfFilePath);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Pratham Tours_Receipt_${orderId}.pdf`);
    res.setHeader("Content-Length", fileData.length);

    res.send(fileData);

    setTimeout(() => {
      try {
        if (fs.existsSync(pdfFilePath)) {
          fs.unlinkSync(pdfFilePath);
          console.log("Temporary PDF file deleted successfully after download");
        }
      } catch (deleteError) {
        console.error("Warning: Could not delete temporary PDF file after download:", deleteError);
      }
    }, 15000);
  } catch (error) {
    console.error("Error generating receipt:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to generate receipt PDF",
        error: error.message,
      });
    }
  }
};
export const getRunningCheck = async (req, res) => {
  res.send("Cashfree Payment Gateway API is running");
};
