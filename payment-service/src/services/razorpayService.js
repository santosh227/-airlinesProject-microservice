const Razorpay = require('razorpay');
const crypto = require('crypto');
const dotenv = require('dotenv').config()

class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_SECRET
    });
    
    console.log('🔑 Razorpay Service initialized with key:', process.env.RAZORPAY_KEY_ID?.substring(0, 12) + '...');
  }

  // Create Razorpay Order
  async createOrder(amount, currency = 'INR', receiptId, notes = {}) {
    try {
      const options = {
        amount: Math.round(amount * 100), // Convert to paise (₹1 = 100 paise)
        currency: currency.toUpperCase(),
        receipt: receiptId,
        notes: notes,
        payment_capture: 1 // Auto capture payment
      };

      console.log('💰 Creating Razorpay order:', { 
        amount: options.amount, 
        currency, 
        receipt: receiptId 
      });
      
      const order = await this.razorpay.orders.create(options);
      
      console.log('✅ Razorpay order created successfully:', order.id);

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status
      };
      
    } catch (error) {
      console.error('❌ Razorpay Order Creation Error:', error);
      return {
        success: false,
        error: error.message,
        description: error.error?.description
      };
    }
  }

  // Verify Payment Signature
  verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    try {
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_SECRET)
        .update(body.toString())
        .digest('hex');
      
      const isVerified = expectedSignature === razorpaySignature;
      
      console.log(isVerified ? '✅ Payment signature verified' : '❌ Payment signature verification failed');
      
      return isVerified;
    } catch (error) {
      console.error('❌ Payment signature verification error:', error);
      return false;
    }
  }

  // Get Payment Details
  async getPaymentDetails(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        success: true,
        payment: payment
      };
    } catch (error) {
      console.error('❌ Error fetching payment details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create Refund
  async createRefund(paymentId, amount = null, speed = 'normal', notes = {}) {
    try {
      const refundData = {
        speed: speed,
        notes: notes
      };
      
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }

      console.log(`💸 Creating refund for payment ${paymentId}:`, refundData);
      
      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      
      console.log('✅ Refund created successfully:', refund.id);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100, // Convert back to rupees
        status: refund.status,
        speed: refund.speed,
        created: refund.created_at
      };
      
    } catch (error) {
      console.error('❌ Razorpay Refund Error:', error);
      return {
        success: false,
        error: error.message,
        description: error.error?.description
      };
    }
  }

  // Verify Webhook Signature
  verifyWebhookSignature(payload, signature) {
    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      return false;
    }
  }
}

module.exports = new RazorpayService();
