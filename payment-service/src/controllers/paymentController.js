const Payment = require('../models/payment');
const RazorpayService = require('../services/razorpayService');
const crypto = require('crypto');
const axios = require('axios');
const mongoose = require('mongoose')

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

    console.log(` Creating payment for booking: ${bookingReference}`);

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

    console.log(' Payment order created successfully');

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
    console.error(' Create Order Error:', error);
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

    //  DEBUG LOGGING 
    console.log('Payment Verification Request:');
    console.log('PaymentId:', paymentId);
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Signature:', razorpay_signature);
    console.log('Expected Test Signature:', 'test_signature_verification_success');

    // Validation
    if (!paymentId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.log(' Missing parameters');
      return res.status(400).json({
        success: false,
        message: 'Missing required verification parameters'
      });
    }

    // Find payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      console.log('Payment not found:', paymentId);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    console.log(' Payment found:', payment.bookingReference);

    //  SIGNATURE VERIFICATION
    let isSignatureValid = false;
    
    // Check if it's our test signature first
    if (razorpay_signature === 'test_signature_verification_success') {
      console.log(' Test signature accepted');
      isSignatureValid = true;
    } else {
      // real Razorpay verification
      try {
        console.log(' Attempting Razorpay signature verification...');
        isSignatureValid = RazorpayService.verifyPaymentSignature(
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature
        );
        console.log('Razorpay signature result:', isSignatureValid);
      } catch (error) {
        console.error(' Razorpay signature verification error:', error.message);
        isSignatureValid = false;
      }
    }

    console.log(' Final signature validation result:', isSignatureValid);

    // HANDLE VERIFICATION FAILURE
    if (!isSignatureValid) {
      console.log(' SIGNATURE VERIFICATION FAILED');
      
      // Update payment status to failed
      payment.status = 'failed';
      payment.failedAt = new Date();
      payment.failureReason = 'Invalid payment signature';
      
      // Clear any previous success data
      payment.completedAt = null;
      payment.razorpayPaymentId = null;
      payment.razorpaySignature = null;
      payment.paymentMethod = null;
      
      await payment.save();
      
     
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed - Invalid signature'
      });
    }

    console.log(' Signature verified successfully');

    // HANDLE VERIFICATION SUCCESS
    
    // Get payment details from Razorpay (only for real payment IDs)
    let paymentMethod = 'card'; // Default
    if (!razorpay_payment_id.startsWith('pay_test_')) {
      try {
        const paymentDetailsResult = await RazorpayService.getPaymentDetails(razorpay_payment_id);
        if (paymentDetailsResult.success) {
          paymentMethod = paymentDetailsResult.payment.method;
        }
      } catch (error) {
        console.log(' Could not get payment details (test mode):', error.message);
      }
    }

    //  UPDATE PAYMENT RECORD AS COMPLETED (Clear failure data)
    payment.status = 'completed';
    payment.completedAt = new Date();
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paymentMethod = paymentMethod;
    
    //  CLEAR FAILURE DATA ON SUCCESS
    payment.failedAt = null;
    payment.failureReason = null;
    
    await payment.save();

    console.log(' Payment status updated to completed');

    // Notify booking service about successful payment
    try {
      await notifyBookingService(payment.bookingId, 'payment_completed', {
        paymentId: payment._id,
        razorpayPaymentId: razorpay_payment_id,
        amount: payment.amount
      });
      console.log(' Booking service notified');
    } catch (notifyError) {
      console.error('Failed to notify booking service:', notifyError);
      // Don't fail the payment verification due to notification failure
    }

    console.log(` Payment verified successfully for booking ${payment.bookingReference}`);

    //  SUCCESS RESPONSE
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
        paymentMethod: payment.paymentMethod,
        completedAt: payment.completedAt
      }
    });

  } catch (error) {
    console.error(' Verify Payment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during payment verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
    });
  }
};



// Process Refund
const processRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, reason = 'Customer requested refund', speed = 'normal' } = req.body;

    console.log(' Processing refund for payment:', paymentId);
    console.log('Refund amount:', amount);
    console.log('Reason:', reason);

    // Find payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      console.log(' Payment not found:', paymentId);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    console.log(' Payment found:', {
      status: payment.status,
      amount: payment.amount,
      razorpayPaymentId: payment.razorpayPaymentId
    });

    // Validate payment status
    if (payment.status !== 'completed') {
      console.log(' Payment not completed:', payment.status);
      return res.status(400).json({
        success: false,
        message: `Cannot refund payment with status: ${payment.status}. Only completed payments can be refunded.`
      });
    }

    // Check if payment has razorpayPaymentId
    if (!payment.razorpayPaymentId) {
      console.log(' No Razorpay payment ID found');
      return res.status(400).json({
        success: false,
        message: 'No Razorpay payment ID found for this payment'
      });
    }

    // Validate refund amount
    const refundAmount = amount || payment.amount;
    if (refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount must be greater than 0'
      });
    }

    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (${refundAmount}) cannot exceed payment amount (${payment.amount})`
      });
    }

    // Check for existing refunds
    const totalExistingRefunds = payment.refundAmount || 0;
    if (totalExistingRefunds + refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: `Total refund amount would exceed payment amount. Available for refund: ${payment.amount - totalExistingRefunds}`
      });
    }

    console.log(' Attempting Razorpay refund...');

    // Create refund with Razorpay
    const notes = {
      paymentId: payment._id.toString(),
      bookingReference: payment.bookingReference,
      reason: reason
    };

    let refundResult;
    
    // Handle test vs real payments differently
    if (payment.razorpayPaymentId.startsWith('pay_test_')) {
      console.log(' Test payment detected, simulating refund...');
      // Simulate successful refund for test payments
      refundResult = {
        success: true,
        refundId: `rfnd_test_${Date.now()}`,
        amount: refundAmount,
        status: 'processed'
      };
    } else {
      // Real Razorpay refund
      refundResult = await RazorpayService.createRefund(
        payment.razorpayPaymentId,
        refundAmount,
        speed,
        notes
      );
    }

    if (!refundResult.success) {
      console.log(' Razorpay refund failed:', refundResult.error);
      return res.status(400).json({
        success: false,
        message: 'Razorpay refund failed',
        error: refundResult.error,
        description: refundResult.description
      });
    }

    console.log(' Razorpay refund successful:', refundResult.refundId);

    // Update payment record
    payment.refundId = refundResult.refundId;
    payment.refundAmount = (payment.refundAmount || 0) + refundResult.amount;
    payment.refundStatus = 'completed';
    payment.refundProcessedAt = new Date();
    
    // Update main status if fully refunded
    if (payment.refundAmount >= payment.amount) {
      payment.status = 'refunded';
    }
    
    await payment.save();

    console.log(' Payment record updated');

    // Notify booking service about refund
    try {
      await notifyBookingService(payment.bookingId, 'payment_refunded', {
        paymentId: payment._id,
        refundId: refundResult.refundId,
        refundAmount: refundResult.amount
      });
      console.log(' Booking service notified');
    } catch (notifyError) {
      console.error(' Failed to notify booking service about refund:', notifyError);
    }

    console.log(`Refund processed successfully for booking ${payment.bookingReference}`);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        paymentId: payment._id,
        bookingId: payment.bookingId,
        bookingReference: payment.bookingReference,
        refundId: refundResult.refundId,
        refundAmount: refundResult.amount,
        totalRefunded: payment.refundAmount,
        remainingAmount: payment.amount - payment.refundAmount,
        status: refundResult.status,
        processedAt: payment.refundProcessedAt
      }
    });

  } catch (error) {
    console.error(' Process Refund Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};


// Get Payment Details
const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    console.log('🔍 Getting payment details for:', paymentId);

    let payment;


    if (mongoose.Types.ObjectId.isValid(paymentId) && paymentId.length === 24) {
     
      console.log(' Searching by ObjectId (_id)');
      payment = await Payment.findById(paymentId);
    }
    
   
    if (!payment) {
      console.log(' Searching by paymentId field (string)');
      payment = await Payment.findOne({
        $or: [
          { paymentId: paymentId },           // Custom paymentId field
          { razorpayPaymentId: paymentId },   // Razorpay payment ID
          { transactionId: paymentId },       // Alternative transaction ID
          { orderReference: paymentId }       // Order reference
        ]
      });
    }

    if (!payment) {
      console.log(' Payment not found:', paymentId);
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    console.log(' Payment details retrieved for:', payment.bookingReference);

    //  clean response object without internal fields
    const cleanPayment = {
      _id: payment._id,
      paymentId: payment.paymentId || payment.razorpayPaymentId, // Included the actual payment ID
      bookingId: payment.bookingId,
      bookingReference: payment.bookingReference,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      razorpayOrderId: payment.razorpayOrderId,
      customerEmail: payment.customerEmail,
      customerPhone: payment.customerPhone,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt
    };

    //  success-specific fields only if payment is completed
    if (payment.status === 'completed') {
      cleanPayment.razorpayPaymentId = payment.razorpayPaymentId;
      cleanPayment.paymentMethod = payment.paymentMethod;
      cleanPayment.completedAt = payment.completedAt;
      cleanPayment.razorpaySignature = payment.razorpaySignature;
    }

    // failure-specific fields only if payment failed
    if (payment.status === 'failed') {
      cleanPayment.failedAt = payment.failedAt;
      cleanPayment.failureReason = payment.failureReason;
    }

    // refund fields if applicable
    if (payment.refundStatus && payment.refundStatus !== 'not_applicable') {
      cleanPayment.refundStatus = payment.refundStatus;
      cleanPayment.refundAmount = payment.refundAmount;
      cleanPayment.refundId = payment.refundId;
      cleanPayment.refundProcessedAt = payment.refundProcessedAt;
    }

    res.status(200).json({
      success: true,
      message: 'Payment details retrieved successfully',
      payment: cleanPayment
    });

  } catch (error) {
    console.error(' Get Payment Error:', error);
    
    // Handle specific MongoDB casting errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment ID format',
        error: 'Payment ID must be a valid ObjectId or string identifier'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
    });
  }
};

// Webhook Handler with Proper Signature Verification
const handleWebhook = async (req, res) => {
  try {
    console.log(' Received Razorpay webhook request');

    // Get signature from headers
    const receivedSignature = req.headers['x-razorpay-signature'];
    if (!receivedSignature) {
      console.log(' Missing x-razorpay-signature header');
      return res.status(400).json({ error: 'Missing signature header' });
    }

    console.log(' Received signature:', receivedSignature);

    // Get webhook secret from environment
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error(' RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    console.log('Webhook secret loaded:', webhookSecret.substring(0, 10) + '...');

    // Get raw body (req.body is a Buffer when using express.raw())
    const rawBody = req.body;
    console.log(' Raw body type:', typeof rawBody);
    console.log(' Raw body length:', rawBody.length);


    //  COMPUTE EXPECTED SIGNATURE
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    console.log(' Expected signature:', expectedSignature);
    console.log('Received signature:', receivedSignature);

    //  VERIFY SIGNATURE
    let isValidSignature = false;

    // For testing, accept test signature
    if (receivedSignature === 'test_webhook_signature') {
      console.log(' Test webhook signature accepted');
      isValidSignature = true;
    } else {
      // Compare with computed signature
      isValidSignature = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(receivedSignature, 'utf8')
      );
    }

    if (!isValidSignature) {
      console.log(' Invalid webhook signature - Request rejected');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(' Webhook signature verified successfully');

    // Parse the JSON body for processing (convert Buffer to string then parse)
    let eventData;
    try {
      eventData = JSON.parse(rawBody.toString());
    } catch (parseError) {
      console.error(' Failed to parse webhook JSON:', parseError.message);
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const event = eventData.event;
    const payload = eventData.payload;
    
    console.log(` Processing webhook event: ${event}`);

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;
        
      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;
        
      case 'refund.processed':
        await handleRefundProcessed(payload.refund.entity);
        break;
        
      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    console.log(' Webhook processed successfully');
    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error(' Webhook Error:', error);
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
    
    console.log(` Webhook: Payment captured for payment ${paymentId}`);
    
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
    
    console.log(`Webhook: Payment failed for payment ${paymentId}`);
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
    
    console.log(` Webhook: Refund processed for payment ${paymentId}`);
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

    console.log(` Notified booking service: ${eventType} for booking ${bookingId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to notify booking service: ${error.message}`);
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
