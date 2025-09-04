const express = require('express');
const mongoose = require('mongoose')
const router = express.Router();
const Booking = require('../../models/Booking')


const { 
  createCompleteBooking, 
  getBookingById, 
  getUserBookings,
  getFlightAvailability,
  getBookingByReference,
  cancelBooking,
  getBookingStatusHistory 
} = require('../../controllers/Booking-controller');

const limiter = require('../../common/rate-limit');
const idempotency = require('../../middlewares/idempotency');


router.post('/book', idempotency, createCompleteBooking);  // done 
router.get('/booking/:bookingId', getBookingById);        
router.get('/user/:userId', getUserBookings);             // done 
router.get('/reference/:bookingRef', getBookingByReference); 
router.get('/flights/:flightId/availability', getFlightAvailability);  // done 


router.patch('/booking/:bookingId/cancel', limiter, idempotency, cancelBooking);  // done 
router.get('/booking/:bookingId/status-history', getBookingStatusHistory);    // done 

// Quick status check endpoint                                               //done 
router.get('/booking/:bookingId/status', async (req, res) => {
  try {
    const { bookingId } = req.params;  
    
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID format' });
    }
    
    const booking = await Booking.findById(bookingId)
      .select('bookingReference status canBeCancelled refundStatus totalCost');
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({
      success: true,
      status: {
        bookingReference: booking.bookingReference,
        status: booking.status,
        canBeCancelled: booking.canBeCancelled,
        refundStatus: booking.refundStatus,
        totalCost: booking.totalCost
      }
    });
  } catch (error) {
    console.error('Error getting booking status:', error); // Add logging
    res.status(500).json({ success: false, message: 'Failed to get booking status' });
  }
});


module.exports = router;
