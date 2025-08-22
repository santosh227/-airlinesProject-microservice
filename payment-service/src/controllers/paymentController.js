const Payment = require('../models/Payment');
const RazorpayService = require('../services/razorpayService');
const axios = require('axios');

// Create Razorpay Order
const createOrder = async (req, res) => {
  try {
    const { 
      bookingId, 
      bookingReference, 
      userId, 
      amount, 
      currency = 'INR', 
      customerEmail,
      customerPhone 
    } = req.body;

    // Validation
    if (!bookingId || !bookingReference || !userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: bookingId, bookingReference, userId, amount'
      });
    }

    console.log(`📝 Creating payment for booking: ${bookingReference}`);

    // Create payment record in database
    const payment = new Payment({
      bookingId,
      bookingReference,
      userId,
      amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      customerEmail,
      customerPhone
    });

    await payment.save();

    // Create Razorpay Order
    const receiptId = `receipt_${bookingReference}_${Date.now()}`;
    const notes = {
      paymentId: payment._id.toString(),
      bookingId,
      userId,
      bookingReference
    };

    const orderResult = await RazorpayService.createOrder(amount, currency, receiptId, notes);
    
    if (!orderResult.success) {
      payment.status = 'failed';
      payment.errorMessage = orderResult.error;
      await payment.save();

      return res.status(400).json({
        success: false,
        message: 'Failed to create Razorpay order',
        error: orderResult.error
      });
    }

    // Update payment record with Razorpay order ID
    payment.razorpayOrderId = orderResult.orderId;
    payment.status = 'processing';
    await payment.save();

    console.log('✅ Payment order created successfully');

    res.status(201).json({
      success: true,
      message: 'Payment order created successfully',
      data: {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        bookingReference: payment.bookingReference,
        razorpayOrderId: orderResult.orderId,
        amount: orderResult.amount / 100, // Convert back to rupees for display
        currency: orderResult.currency,
        key: process.env.RAZORPAY_KEY_ID // Frontend needs this for Razorpay checkout
      }
    });

  } catch (error) {
    console.error('❌ Create Order Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Verify Payment
const verifyPayment = async (req, res) => {
  try {
    const { 
      paymentId,
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature 
    } = req.body;

    if (!paymentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required verification parameters'
      });
    }

    // Find payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Verify signature with Razorpay
    const isSignatureValid = RazorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.failureReason = 'Invalid payment signature';
      await payment.save();
      
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Get payment details from Razorpay
    const paymentDetailsResult = await RazorpayService.getPaymentDetails(razorpay_payment_id);
    
    if (paymentDetailsResult.success) {
      payment.paymentMethod = paymentDetailsResult.payment.method;
    }

    // Update payment record as completed
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();

    // Notify booking service about successful payment
    try {
      await notifyBookingService(payment.bookingId, 'payment_completed', {
        paymentId: payment._id,
        razorpayPaymentId: razorpay_payment_id,
        amount: payment.amount
      });
    } catch (notifyError) {
      console.error('❌ Failed to notify booking service:', notifyError);
    }

    console.log(`✅ Payment verified successfully for booking ${payment.bookingReference}`);

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        bookingReference: payment.bookingReference,
        razorpayPaymentId: razorpay_payment_id,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod
      }
    });

  } catch (error) {
    console.error('❌ Verify Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

// Process Refund
const processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason = 'Customer requested refund', speed = 'normal' } = req.body;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    if (!payment.razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'No payment information found for this booking'
      });
    }

    // Calculate refund amount (use full amount if not specified)
    const refundAmount = amount || payment.amount;

    // Create refund with Razorpay
    const notes = {
      paymentId: payment._id.toString(),
      bookingReference: payment.bookingReference,
      reason: reason
    };

    const refundResult = await RazorpayService.createRefund(
      payment.razorpayPaymentId,
      refundAmount,
      speed,
      notes
    );

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to process refund',
        error: refundResult.error
      });
    }

    // Update payment record
    payment.refundId = refundResult.refundId;
    payment.refundAmount = refundResult.amount;
    payment.refundStatus = 'completed';
    payment.refundProcessedAt = new Date();
    payment.status = 'refunded';
    await payment.save();

    // Notify booking service about refund
    try {
      await notifyBookingService(payment.bookingId, 'payment_refunded', {
        paymentId: payment._id,
        refundId: refundResult.refundId,
        refundAmount: refundResult.amount
      });
    } catch (notifyError) {
      console.error('❌ Failed to notify booking service about refund:', notifyError);
    }

    console.log(`💸 Refund processed successfully for booking ${payment.bookingReference}`);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        bookingReference: payment.bookingReference,
        refundId: refundResult.refundId,
        refundAmount: refundResult.amount,
        status: refundResult.status,
        processedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Process Refund Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Get Payment Details
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment: payment
    });

  } catch (error) {
    console.error('❌ Get Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment details'
    });
  }
};

// Webhook Handler
const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const payload = JSON.stringify(req.body);
    
    // Verify webhook signature
    const isValid = RazorpayService.verifyWebhookSignature(payload, signature);
    
    if (!isValid) {
      console.log('❌ Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body.event;
    const payloadData = req.body.payload;
    
    console.log(`📧 Received Razorpay webhook: ${event}`);

    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payloadData.payment.entity);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(payloadData.payment.entity);
        break;
        
      case 'refund.processed':
        await handleRefundProcessed(payloadData.refund.entity);
        break;
        
      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('❌ Webhook Error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Helper: Handle payment captured
async function handlePaymentCaptured(payment) {
  try {
    const paymentId = payment.notes.paymentId;
    if (!paymentId) return;

    const paymentRecord = await Payment.findById(paymentId);
    if (!paymentRecord) return;

    paymentRecord.status = 'completed';
    paymentRecord.completedAt = new Date();
    paymentRecord.razorpayPaymentId = payment.id;
    paymentRecord.paymentMethod = payment.method;
    await paymentRecord.save();
    
    console.log(`✅ Webhook: Payment captured for payment ${paymentId}`);
    
    // Notify booking service
    await notifyBookingService(paymentRecord.bookingId, 'payment_completed', {
      paymentId: paymentRecord._id,
      amount: paymentRecord.amount
    });
  } catch (error) {
    console.error('Error handling payment captured:', error);
  }
}

// Helper: Handle payment failed
async function handlePaymentFailed(payment) {
  try {
    const paymentId = payment.notes.paymentId;
    if (!paymentId) return;

    const paymentRecord = await Payment.findById(paymentId);
    if (!paymentRecord) return;

    paymentRecord.status = 'failed';
    paymentRecord.failedAt = new Date();
    paymentRecord.failureReason = payment.error_description || 'Payment declined';
    await paymentRecord.save();
    
    console.log(`❌ Webhook: Payment failed for payment ${paymentId}`);
  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

// Helper: Handle refund processed
async function handleRefundProcessed(refund) {
  try {
    const paymentId = refund.notes.paymentId;
    if (!paymentId) return;

    const payment = await Payment.findById(paymentId);
    if (!payment) return;

    payment.refundStatus = 'completed';
    payment.refundProcessedAt = new Date();
    await payment.save();
    
    console.log(`💸 Webhook: Refund processed for payment ${paymentId}`);
  } catch (error) {
    console.error('Error handling refund processed:', error);
  }
}

// Helper: Notify Booking Service
async function notifyBookingService(bookingId, eventType, data) {
  try {
    const response = await axios.post(
      `${process.env.BOOKING_SERVICE_URL}/api/v1/bookings/payment-webhook`,
      {
        bookingId,
        eventType,
        data
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BOOKING_SERVICE_API_KEY}`
        },
        timeout: 10000
      }
    );

    console.log(`✅ Notified booking service: ${eventType} for booking ${bookingId}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Failed to notify booking service: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createOrder,
  verifyPayment,
  processRefund,
  getPaymentDetails,
  handleWebhook
};
