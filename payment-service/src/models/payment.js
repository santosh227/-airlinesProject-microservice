const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Booking Information
  bookingId: { 
    type: String, 
    required: true, 
    index: true 
  },
  bookingReference: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  
  // Payment Details
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'INR' 
  },
  
  // Razorpay Specific Fields
  razorpayOrderId: { 
    type: String 
  },
  razorpayPaymentId: { 
    type: String 
  },
  razorpaySignature: { 
    type: String 
  },
  
  // Status Management
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: { 
    type: Date 
  },
  failedAt: { 
    type: Date 
  },
  
  // Refund Information
  refundId: { 
    type: String 
  },
  refundAmount: { 
    type: Number, 
    default: 0 
  },
  refundStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'processing', 'completed', 'failed'],
    default: 'not_applicable'
  },
  refundProcessedAt: { 
    type: Date 
  },
  
  // Error Tracking
  errorMessage: { 
    type: String 
  },
  failureReason: { 
    type: String 
  },
  
  // Customer Information
  customerEmail: { 
    type: String 
  },
  customerPhone: { 
    type: String 
  },
  paymentMethod: { 
    type: String 
  } // card, netbanking, wallet, upi
}, { 
  timestamps: true 
});

// Indexes for Performance
// paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ razorpayOrderId: 1 });
paymentSchema.index({ razorpayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
