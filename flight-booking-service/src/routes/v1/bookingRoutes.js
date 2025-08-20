const express = require('express');
const router = express.Router();

const { 
  createCompleteBooking, 
  getBookingById, 
  getUserBookings,getFlightAvailability,
  getBookingByReference
} = require('../../controllers/Booking-controller');
const limiter = require('../../common/rate-limit')
const idempotency = require('../../middlewares/idempotency')

// Create complete booking with database storage
router.post('/book', limiter,idempotency,createCompleteBooking);

// Get specific booking by ID
router.get('/booking/:bookingId', getBookingById);

// Get all bookings for a user
router.get('/user/:userId', getUserBookings);

// Get booking by reference
router.get('/reference/:bookingRef', getBookingByReference);


// Quick Flight search 

router.get('/flights/:flightId/availability', getFlightAvailability);

module.exports = router;
