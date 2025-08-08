const express = require('express');
const router = express.Router();

const { 
  createCompleteBooking, 
  getBookingById, 
  getUserBookings,
  getBookingByReference
} = require('../../controllers/Booking-controller');

// Create complete booking with database storage
router.post('/book', createCompleteBooking);

// Get specific booking by ID
router.get('/booking/:bookingId', getBookingById);

// Get all bookings for a user
router.get('/user/:userId', getUserBookings);

// Get booking by reference
router.get('/reference/:bookingRef', getBookingByReference);

module.exports = router;
