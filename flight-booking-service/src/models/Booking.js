const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flight",
      required: true,
    },
    seats: [{
      type: String,
      required: true
    }],
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "confirmed"
    },
    bookedAt: {
      type: Date,
      default: Date.now
    },
    price: {
      type: Number,
      required: true
    },
    paymentId: {
      type: String
    }
  },
  { timestamps: true }
);

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;
