const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const {
  createOrder,
  verifyPayment,
  processRefund,
  getPaymentDetails,
  handleWebhook
} = require('../../controllers/paymentController');

// Rate limiting for payment endpoints
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.'
  }
});

// Payment Routes
router.post('/create-order', paymentLimiter, createOrder);
router.post('/verify-payment', paymentLimiter, verifyPayment);
router.post('/refund/:paymentId', processRefund);


/// satatus after success payment 
router.get('/payment/:paymentId', getPaymentDetails);

// Webhook endpoint 
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Health check for payment service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payment service is running',
    timestamp: new Date().toISOString(),
    razorpayConnected: !!process.env.RAZORPAY_KEY_ID,
    environment: process.env.NODE_ENV
  });
});

module.exports = router;
