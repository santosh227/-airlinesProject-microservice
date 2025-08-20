const axios = require('axios');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://localhost:3000';



// Helper function to generate unique booking reference
async function generateUniqueReference(flightNumber, destination, date) {
  const prefix = flightNumber.substring(0, 3).toUpperCase();
  const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${dateStr}${random}`;
}

// Helper function to release seats to flight service
async function releaseSeatsToFlightService(flightId, seatsToRelease) {
  try {
    const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://localhost:3000';
    
    console.log(`🔄 Releasing ${seatsToRelease} seats for flight ${flightId}`);
    
    const response = await axios.post(
      `${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/releaseSeats`,
      { seatsToRelease },
      { 
        timeout: 10000, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
    
    if (response.data.success) {
      console.log(`✅ Successfully released ${seatsToRelease} seats`);
      return response.data;
    } else {
      throw new Error('Flight service returned unsuccessful response');
    }
  } catch (error) {
    console.error('❌ Error releasing seats to flight service:', error.message);
    // Don't throw error here - cancellation should still proceed even if seat release fails
    return { success: false, error: error.message };
  }
}

// Helper function to simulate refund processing
async function processRefund(booking) {
  try {
    console.log(`💰 Processing refund for booking ${booking.bookingReference}`);
    
    // Update refund status to processing
    booking.refundStatus = 'processing';
    await booking.save();
    
    // Simulate async refund processing (in real implementation, this would call payment gateway)
    setTimeout(async () => {
      try {
        const updatedBooking = await Booking.findById(booking._id);
        if (updatedBooking) {
          updatedBooking.refundStatus = 'completed';
          await updatedBooking.save();
          console.log(`✅ Refund completed for booking ${updatedBooking.bookingReference}`);
        }
      } catch (error) {
        console.error('❌ Error completing refund:', error);
      }
    }, 5000); // 5 seconds delay to simulate processing
    
  } catch (error) {
    console.error('❌ Error processing refund:', error);
    booking.refundStatus = 'failed';
    await booking.save();
  }
}

//Create Complete Booking with Status Management
const createCompleteBooking = async (req, res) => {
  try {
    // ✅ STEP 1: Initial request debugging and validation (your existing validation code)
    console.log('=== BOOKING REQUEST DEBUG ===');
    console.log('Request body:', req.body);
    console.log('============================');

    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is missing. Please send JSON data."
      });
    }

    const {
      userId = null,
      flightId = null,
      seats = null,
      paymentId = null
    } = req.body;

    // Field validations (your existing validation logic)
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: userId",
        received: req.body
      });
    }

    if (!flightId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: flightId",
        received: req.body
      });
    }

    if (!seats || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid seats field. Must be array with at least one seat.",
        received: { seats, type: typeof seats, isArray: Array.isArray(seats) }
      });
    }

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: paymentId",
        received: req.body
      });
    }

    // Validate ObjectId formats
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId format. Must be valid MongoDB ObjectId."
      });
    }

    if (!mongoose.Types.ObjectId.isValid(flightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid flightId format. Must be valid MongoDB ObjectId."
      });
    }

    const seatsToBook = seats.length;
    console.log(`📋 Processing booking for ${seatsToBook} seats...`);

    // ✅ STEP 2: Generate booking reference
    const bookingReference = await generateUniqueReference('FL', 'DEST', new Date());

    // ✅ STEP 3: Initialize booking with 'initialized' status
    console.log('📋 Creating initial booking record...');
    
    let booking = new Booking({
      userId: new mongoose.Types.ObjectId(userId),
      flightId: new mongoose.Types.ObjectId(flightId),
      bookingReference,
      seats,
      paymentId,
      seatsBooked: seatsToBook,
      status: 'initialized',
      price: 0, // Will be updated after flight service call
      pricePerSeat: 0,
      totalCost: 0
    });

    // Add initial status to history
    booking.statusHistory.push({
      status: 'initialized',
      changedAt: new Date(),
      changedBy: 'system',
      reason: 'Booking created and initialized'
    });

    await booking.save();
    console.log(`✅ Booking ${booking.bookingReference} initialized with ID: ${booking._id}`);

    // ✅ STEP 4: Update status to pending_payment and proceed with flight booking
    try {
      booking.updateBookingStatus('pending_payment', 'Proceeding with seat booking and payment processing', 'system');
      await booking.save();

      // ✅ STEP 5: Pre-booking availability check (your existing code)
      console.log('🔍 Performing pre-booking availability check...');
      const availabilityCheck = await checkAvailabilityBeforeBooking(flightId, seatsToBook);
      
      if (!availabilityCheck.available) {
        throw new Error(`Insufficient seats available: ${availabilityCheck.message}`);
      }

      console.log('✅ Availability check passed, proceeding with seat booking...');

      // ✅ STEP 6: Update status to payment_processing
      booking.updateBookingStatus('payment_processing', 'Availability confirmed, processing seat booking', 'system');
      await booking.save();

      // ✅ STEP 7: Call Flight service to book seats (your existing code)
      console.log(`🛫 Calling Flight Service to book ${seatsToBook} seats...`);
      
      const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://localhost:3000';
      const bookingResponse = await axios.post(
        `${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/bookSeats`,
        { seatsToBook },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!bookingResponse.data || !bookingResponse.data.success) {
        throw new Error(bookingResponse.data?.message || "Flight seat booking failed");
      }

      const flightData = bookingResponse.data.flight;
      const bookingDetails = bookingResponse.data.bookingDetails;

      // ✅ STEP 8: Update booking with pricing details
      booking.price = bookingDetails.totalCost;
      booking.pricePerSeat = bookingDetails.pricePerSeat;
      booking.totalCost = bookingDetails.totalCost;
      booking.seatsBooked = bookingDetails.seatsBooked;

      // ✅ STEP 9: Confirm the booking
      booking.updateBookingStatus('confirmed', 'Payment processed and seats confirmed', 'system');
      await booking.save();

      console.log(`✅ Booking ${booking.bookingReference} completed successfully`);

      // ✅ STEP 10: Return success response
      res.status(201).json({
        success: true,
        message: "Booking completed and confirmed successfully",
        booking: {
          _id: booking._id,
          bookingReference: booking.bookingReference,
          status: booking.status,
          userId: booking.userId,
          flightId: booking.flightId,
          seats: booking.seats,
          paymentId: booking.paymentId,
          bookedAt: booking.bookedAt,
          confirmedAt: booking.confirmedAt,
          seatsBooked: booking.seatsBooked,
          pricePerSeat: booking.pricePerSeat,
          totalCost: booking.totalCost,
          canBeCancelled: booking.canBeCancelled
        },
        flightUpdate: {
          flightId: flightData._id,
          flightNumber: flightData.flightNumber,
          availableSeats: flightData.availableSeats,
          previousSeats: flightData.availableSeats + seatsToBook,
          seatsJustBooked: seatsToBook
        },
        pricingBreakdown: {
          seatsBooked: bookingDetails.seatsBooked,
          pricePerSeat: bookingDetails.pricePerSeat,
          totalCost: bookingDetails.totalCost,
          currency: "INR"
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      // ✅ STEP 11: Handle failure - cancel the booking
      console.error('❌ Booking process failed, cancelling booking:', error.message);
      
      try {
        booking.updateBookingStatus('cancelled', `Booking process failed: ${error.message}`, 'system');
        booking.cancellationReason = `Booking process failed: ${error.message}`;
        booking.cancelledBy = 'system';
        await booking.save();
        
        console.log(`❌ Booking ${booking.bookingReference} cancelled due to processing failure`);
      } catch (cancelError) {
        console.error('❌ Error cancelling failed booking:', cancelError);
      }
      
      return res.status(400).json({
        success: false,
        message: 'Booking failed and has been cancelled',
        bookingReference: booking.bookingReference,
        error: error.message,
        errorType: error.response ? "flight_service_error" : "booking_process_error"
      });
    }

  } catch (error) {
    console.error('❌ Complete booking creation failed:', error);
    res.status(500).json({
      success: false,
      message: "Booking creation failed",
      error: error.message,
      errorType: "internal_server_error"
    });
  }
};

// Cancel a booking
const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason = 'Cancelled by user', cancelledBy = 'user' } = req.body;
    
    console.log(`📋 Cancellation request for booking: ${bookingId}`);
    
    // Validate booking ID format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }
    
    // Find the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if booking can be cancelled
    if (!booking.canBeCancelled) {
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled. Current status: ${booking.status}`,
        currentStatus: booking.status,
        canBeCancelled: booking.canBeCancelled
      });
    }
    
    console.log(`✅ Booking ${booking.bookingReference} can be cancelled. Current status: ${booking.status}`);
    
    // Calculate refund amount
    const refundAmount = booking.calculateRefundAmount();
    console.log(`💰 Calculated refund amount: ₹${refundAmount}`);
    
    // Release seats back to flight service
    console.log(`🔄 Releasing ${booking.seatsBooked} seats back to flight...`);
    const seatReleaseResult = await releaseSeatsToFlightService(booking.flightId, booking.seatsBooked);
    
    if (!seatReleaseResult.success) {
      console.warn(`⚠️ Seat release failed but proceeding with cancellation: ${seatReleaseResult.error}`);
    }
    
    // Update booking status to cancelled
    booking.updateBookingStatus('cancelled', reason, cancelledBy);
    booking.cancellationReason = reason;
    booking.cancelledBy = cancelledBy;
    booking.refundAmount = refundAmount;
    
    if (refundAmount > 0) {
      booking.refundStatus = 'pending';
    }
    
    await booking.save();
    
    console.log(`❌ Booking ${booking.bookingReference} cancelled successfully`);
    
    // Process refund if applicable
    if (refundAmount > 0) {
      console.log(`💳 Initiating refund process for ₹${refundAmount}...`);
      await processRefund(booking);
    }
    
    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        _id: booking._id,
        bookingReference: booking.bookingReference,
        status: booking.status,
        cancelledAt: booking.cancelledAt,
        cancellationReason: booking.cancellationReason,
        cancelledBy: booking.cancelledBy,
        refundAmount: booking.refundAmount,
        refundStatus: booking.refundStatus,
        seatsReleased: booking.seatsBooked
      },
      seatRelease: {
        attempted: true,
        successful: seatReleaseResult.success,
        error: seatReleaseResult.error || null
      }
    });
    
  } catch (error) {
    console.error('❌ Error cancelling booking:', error);
    
    if (error.message.includes('Invalid status transition')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

// Get booking status history
const getBookingStatusHistory = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }
    
    const booking = await Booking.findById(bookingId).select('bookingReference status statusHistory canBeCancelled');
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        bookingReference: booking.bookingReference,
        currentStatus: booking.status,
        canBeCancelled: booking.canBeCancelled,
        statusHistory: booking.statusHistory.sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt))
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting booking status history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking status history',
      error: error.message
    });
  }
};


//  HELPER FUNCTION: Check availability before booking (NEW)
const checkAvailabilityBeforeBooking = async (flightId, requestedSeats) => {
  try {
    console.log(`🔍 Checking availability: Flight ${flightId}, Seats ${requestedSeats}`);
    
    const availabilityResponse = await axios.get(
      `${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/availability?seats=${requestedSeats}`,
      { timeout: 5000 }
    );

    if (!availabilityResponse.data.success) {
      console.log('❌ Availability check returned error:', availabilityResponse.data.message);
      return {
        available: false,
        message: availabilityResponse.data.message,
        data: availabilityResponse.data
      };
    }

    console.log(`✅ Availability check result: ${availabilityResponse.data.available ? 'Available' : 'Not Available'}`);
    console.log(`📊 Available seats: ${availabilityResponse.data.availability?.availableSeats}`);

    return {
      available: availabilityResponse.data.available,
      message: availabilityResponse.data.message,
      data: availabilityResponse.data
    };

  } catch (error) {
    console.error('❌ Availability check failed:', error.message);
    return {
      available: false,
      message: "Could not verify seat availability",
      error: error.message
    };
  }
};

//  STANDALONE AVAILABILITY ENDPOINT
const getFlightAvailability = async (req, res) => {
  try {
    const { flightId } = req.params;
    const { seats = 1 } = req.query;

    console.log(`📋 Availability request: Flight ${flightId}, Seats ${seats}`);

    // Forward request to Flight Management Service
    const availabilityCheck = await checkAvailabilityBeforeBooking(flightId, seats);

    if (!availabilityCheck.available && availabilityCheck.error) {
      return res.status(503).json({
        success: false,
        message: "Flight service unavailable",
        error: "SERVICE_UNAVAILABLE"
      });
    }

    // Return the availability data
    res.status(200).json(availabilityCheck.data);

  } catch (error) {
    console.error('Get flight availability error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to check flight availability",
      error: error.message
    });
  }
};

// ✅ EXISTING HELPER FUNCTIONS (unchanged)
function generateBookingReference(flightNumber, arrivalCode, bookedDate) {
  const date = new Date(bookedDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Generate random 2-character suffix (excluding 0 and O for clarity)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let randomSuffix = '';
  for (let i = 0; i < 2; i++) {
    randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Format: AI786BOM0813A1
  const reference = `${flightNumber}${arrivalCode}${month}${day}${randomSuffix}`;
  
  console.log(`Generated booking reference: ${reference}`);
  return reference;
}

// Function to ensure unique reference
async function generateUniqueReference(flightNumber, arrivalCode, bookedDate) {
  let reference;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    reference = generateBookingReference(flightNumber, arrivalCode, bookedDate);
    
    // Check if reference already exists
    const existing = await Booking.findOne({ bookingReference: reference });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique booking reference after 10 attempts');
  }
  
  return reference;
}

// Get booking by ID with enhanced error handling
const getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID format"
      });
    }
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Get current flight details with error handling
    let flightDetails = null;
    try {
      const flightResponse = await axios.get(
        `${FLIGHT_SERVICE_URL}/api/v1/flights/${booking.flightId}`,
        { timeout: 5000 }
      );
      if (flightResponse.data && flightResponse.data.success) {
        flightDetails = flightResponse.data.data;
      }
    } catch (flightError) {
      console.warn('Could not fetch flight details:', flightError.message);
      flightDetails = { error: "Flight details temporarily unavailable" };
    }

    res.status(200).json({
      success: true,
      message: "Booking retrieved successfully",
      booking: {
        ...booking.toObject(),
        currentFlightDetails: flightDetails
      }
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve booking",
      error: error.message
    });
  }
};

// Get all bookings for a user with enhanced error handling
const getUserBookings = async (req, res) => {
  try {
    const rawUserId = req.params.userId;
    const userId = rawUserId ? rawUserId.trim() : '';
    
    // Simple validation - must be 24 character hex string
    if (!userId || userId.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format - must be 24 characters",
        debug: {
          received: userId,
          length: userId.length,
          expected: 24
        }
      });
    }
    
    // Check if it contains only valid hex characters
    const hexPattern = /^[0-9a-fA-F]{24}$/;
    if (!hexPattern.test(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format - must contain only hex characters (0-9, a-f, A-F)",
        debug: {
          received: userId,
          validHex: false
        }
      });
    }
    
    // Create proper ObjectId and search
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format - cannot convert to ObjectId",
        error: error.message
      });
    }
    
    // Search for bookings
    const bookings = await Booking.find({ userId: objectId }).sort({ bookedAt: -1 });
    
    console.log(`Found ${bookings.length} bookings for user ${userId}`);
    
    if (bookings.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No bookings found for this user",
        count: 0,
        bookings: []
      });
    }

    // Get flight details for each booking
    const bookingsWithFlightDetails = await Promise.allSettled(
      bookings.map(async (booking) => {
        try {
          const flightResponse = await axios.get(
            `${FLIGHT_SERVICE_URL}/api/v1/flights/${booking.flightId}`,
            { timeout: 5000 }
          );
          return {
            ...booking.toObject(),
            flightDetails: flightResponse.data.success ? flightResponse.data.data : null
          };
        } catch (error) {
          return {
            ...booking.toObject(),
            flightDetails: { error: "Flight details unavailable" }
          };
        }
      })
    );

    // Process results and return
    const processedBookings = bookingsWithFlightDetails.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          ...bookings[index].toObject(),
          flightDetails: { error: "Failed to fetch flight details" }
        };
      }
    });

    res.status(200).json({
      success: true,
      message: `Found ${bookings.length} bookings for user`,
      count: bookings.length,
      bookings: processedBookings
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user bookings",
      error: error.message
    });
  }
};

// Get booking by reference with enhanced error handling
const getBookingByReference = async (req, res) => {
  try {
    const { bookingRef } = req.params;
    
    // Clean and validate reference
    const cleanRef = bookingRef.trim().toUpperCase();
    
    if (!cleanRef || cleanRef.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking reference format"
      });
    }

    console.log(`Searching for booking with reference: ${cleanRef}`);
    
    const booking = await Booking.findOne({ 
      bookingReference: cleanRef 
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found with this reference number"
      });
    }

    // Get current flight details
    let flightDetails = null;
    try {
      const flightResponse = await axios.get(
        `${FLIGHT_SERVICE_URL}/api/v1/flights/${booking.flightId}`,
        { timeout: 5000 }
      );
      if (flightResponse.data && flightResponse.data.success) {
        flightDetails = flightResponse.data.data;
      }
    } catch (error) {
      console.warn('Could not fetch flight details:', error.message);
      flightDetails = { error: "Flight details temporarily unavailable" };
    }

    res.status(200).json({
      success: true,
      message: "Booking found successfully",
      booking: {
        ...booking.toObject(),
        currentFlightDetails: flightDetails
      }
    });

  } catch (error) {
    console.error('Get booking by reference error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve booking",
      error: error.message
    });
  }
};

// Helper functions for booking reference generation
function generateBookingReference(flightNumber, arrivalCode, bookedDate) {
  const date = new Date(bookedDate);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Generate random 2-character suffix (excluding 0 and O for clarity)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
  let randomSuffix = '';
  for (let i = 0; i < 2; i++) {
    randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Format: AI786BOM0808A1
  const reference = `${flightNumber}${arrivalCode}${month}${day}${randomSuffix}`;
  
  console.log(`Generated booking reference: ${reference}`);
  return reference;
}

// Function to ensure unique reference
async function generateUniqueReference(flightNumber, arrivalCode, bookedDate) {
  let reference;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    reference = generateBookingReference(flightNumber, arrivalCode, bookedDate);
    
    // Check if reference already exists
    const existing = await Booking.findOne({ bookingReference: reference });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique booking reference after 10 attempts');
  }
  
  return reference;
}

//  MODULE EXPORTS

module.exports = {
  createCompleteBooking,
  getBookingById,
  getUserBookings,
  getBookingByReference,
  getFlightAvailability,
  cancelBooking,
  getBookingStatusHistory 
};

