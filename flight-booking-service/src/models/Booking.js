const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
  flightId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Flight' },
  bookingReference: { type: String, required: true, unique: true },
  seats: { type: [String], required: true },
  paymentId: { type: String, required: true },
  
  // Enhanced status system
  status: {
    type: String,
    enum: ['initialized', 'pending_payment', 'payment_processing', 'confirmed', 'cancelled', 'completed'],
    default: 'initialized'
  },
  
  // Pricing details
  price: { type: Number, required: true },
  seatsBooked: { type: Number, required: true },
  pricePerSeat: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  
  // Timestamps for lifecycle tracking
  bookedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
  cancelledAt: { type: Date },
  completedAt: { type: Date },
  
  // Cancellation details
  cancellationReason: { type: String },
  cancelledBy: { type: String, enum: ['user', 'admin', 'system'] },
  refundAmount: { type: Number, default: 0 },
  refundStatus: { 
    type: String, 
    enum: ['not_applicable', 'pending', 'processing', 'completed', 'failed'],
    default: 'not_applicable'
  },
  
  // Status history for auditing
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: String,
    reason: String,
    _id: false
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Method to update status with validation and history tracking
bookingSchema.methods.updateBookingStatus = function(newStatus, reason = '', changedBy = 'system') {
  const oldStatus = this.status;
  
  // Valid status transitions
  const validTransitions = {
    'initialized': ['pending_payment', 'cancelled'],
    'pending_payment': ['payment_processing', 'cancelled'],
    'payment_processing': ['confirmed', 'cancelled'],
    'confirmed': ['cancelled', 'completed'],
    'cancelled': [], // Final state
    'completed': [] // Final state
  };
  
  // Validate transition
  if (!validTransitions[oldStatus] || !validTransitions[oldStatus].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
  }
  
  this.status = newStatus;
  
  // Set specific timestamp based on new status
  const now = new Date();
  switch (newStatus) {
    case 'confirmed':
      this.confirmedAt = now;
      break;
    case 'cancelled':
      this.cancelledAt = now;
      break;
    case 'completed':
      this.completedAt = now;
      break;
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    changedAt: now,
    changedBy,
    reason
  });
  
  console.log(`📋 Booking ${this.bookingReference} status changed: ${oldStatus} → ${newStatus}`);
};

// Virtual for checking if booking can be cancelled
bookingSchema.virtual('canBeCancelled').get(function() {
  return ['initialized', 'pending_payment', 'payment_processing', 'confirmed'].includes(this.status);
});

// Method to calculate refund amount based on business rules
bookingSchema.methods.calculateRefundAmount = function() {
  if (this.status === 'cancelled' || !this.canBeCancelled) {
    return 0;
  }
  
  
  // - 100% refund if cancelled more than 24 hours before booking
  // - 50% refund if cancelled within 24 hours
  const now = new Date();
  const bookingTime = new Date(this.bookedAt);
  const hoursUntilBooking = (bookingTime - now) / (1000 * 60 * 60);
  
  if (hoursUntilBooking > 24) {
    return this.totalCost; // 100% refund
  } else {
    return Math.floor(this.totalCost * 0.5); // 50% refund
  }
};

module.exports = mongoose.model('Booking', bookingSchema);
