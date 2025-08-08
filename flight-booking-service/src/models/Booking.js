const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  flightId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Flight'
  },
  seats: [{
    type: String,
    required: true
  }],
  price: {
    type: Number,
    required: true
  },
  paymentId: {
    type: String,
    required: true
  },
 
  bookingReference: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  },
  bookedAt: {
    type: Date,
    default: Date.now
  },
  seatsBooked: Number,
  pricePerSeat: Number,
  totalCost: Number
});

//INDEX FOR FASTER SEARCHES
bookingSchema.index({ bookingReference: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
