const axios = require('axios');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://localhost:3000';

// Create complete booking with database storage
const createCompleteBooking = async (req, res) => {
  try {
    // DEBUG: Log incoming request
    console.log('=== BOOKING REQUEST DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request headers Content-Type:', req.get('Content-Type'));
    console.log('Body exists:', !!req.body);
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'NO BODY');
    console.log('============================');

  // Checking  if req.body exists
    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is missing. Please send JSON data.",
        debug: {
          contentType: req.get('Content-Type'),
          bodyExists: !!req.body
        }
      });
    }

    // Destructure with fallback
    const {
      userId = null,
      flightId = null,
      seats = null,
      paymentId = null
    } = req.body;

    //DETAILED: Validation with specific error messages
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

    // VALIDATE: ObjectId format
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
    console.log(`Processing booking for ${seatsToBook} seats...`);

    // SAFE: Call Flight service with proper error handling
    let bookingResponse;
    try {
      console.log(`Calling Flight Service: ${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/bookSeats`);
      
      bookingResponse = await axios.post(
        `${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/bookSeats`,
        { seatsToBook },
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (axiosError) {
      console.error('Flight Service Error:', axiosError.message);
      
      if (axiosError.response) {
        // Flight service responded with error
        return res.status(axiosError.response.status || 400).json({
          success: false,
          message: axiosError.response.data?.message || "Flight service error",
          flightServiceError: axiosError.response.data
        });
      } else if (axiosError.code === 'ECONNREFUSED') {
        // Flight service is not running
        return res.status(503).json({
          success: false,
          message: "Flight Management Service is not available. Please ensure it's running on port 3000.",
          error: "SERVICE_UNAVAILABLE"
        });
      } else {
        // Network or other error
        return res.status(500).json({
          success: false,
          message: "Failed to connect to Flight Management Service",
          error: axiosError.message
        });
      }
    }

    // VALIDATE: Flight service response
    if (!bookingResponse.data || !bookingResponse.data.success) {
      return res.status(400).json({
        success: false,
        message: bookingResponse.data?.message || "Seat booking failed in Flight service",
        flightServiceResponse: bookingResponse.data
      });
    }

    // SAFE: Extract data with validation
    const flightData = bookingResponse.data.flight;
    const bookingDetails = bookingResponse.data.bookingDetails;

    if (!flightData || !bookingDetails) {
      return res.status(500).json({
        success: false,
        message: "Invalid response from Flight service - missing flight data or booking details",
        received: bookingResponse.data
      });
    }

    //  SAFE: Validate booking details structure
    if (!bookingDetails.seatsBooked || !bookingDetails.pricePerSeat || !bookingDetails.totalCost) {
      return res.status(500).json({
        success: false,
        message: "Invalid booking details from Flight service",
        bookingDetails
      });
    }

    console.log('Flight booking successful, creating database record...');

    //  SAFE: Create booking record with try-catch
    let booking;
    try {
      booking = await Booking.create({
        userId: new mongoose.Types.ObjectId(userId),
        flightId: new mongoose.Types.ObjectId(flightId),
        seats,
        price: bookingDetails.totalCost,
        paymentId,
        status: "confirmed",
        bookedAt: new Date(),
        seatsBooked: bookingDetails.seatsBooked,
        pricePerSeat: bookingDetails.pricePerSeat,
        totalCost: bookingDetails.totalCost
      });
    } catch (dbError) {
      console.error('Database Error:', dbError);
      
      // Try to rollback flight seats if booking creation fails
      try {
        await axios.post(
          `${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/bookSeats`,
          { seatsToBook: -seatsToBook }, // Negative to add seats back
          { timeout: 5000 }
        );
        console.log('Seats rolled back due to database error');
      } catch (rollbackError) {
        console.error('Failed to rollback seats:', rollbackError.message);
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create booking record in database",
        error: dbError.message,
        note: "Seats have been restored in flight inventory"
      });
    }

    console.log('Booking created successfully:', booking._id);

    //  SUCCESS: Return comprehensive response
    res.status(201).json({
      success: true,
      message: "Booking completed and stored successfully",
      booking: {
        _id: booking._id,
        userId: booking.userId,
        flightId: booking.flightId,
        seats: booking.seats,
        price: booking.price,
        paymentId: booking.paymentId,
        status: booking.status,
        bookedAt: booking.bookedAt,
        seatsBooked: booking.seatsBooked,
        pricePerSeat: booking.pricePerSeat,
        totalCost: booking.totalCost
      },
      flightUpdate: {
        flightId: flightData._id,
        flightNumber: flightData.flightNumber,
        availableSeats: flightData.availableSeats,
        previousSeats: flightData.availableSeats + seatsToBook
      },
      pricingBreakdown: {
        seatsBooked: bookingDetails.seatsBooked,
        pricePerSeat: bookingDetails.pricePerSeat,
        totalCost: bookingDetails.totalCost,
        message: bookingDetails.message
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Unexpected booking error:', error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred during booking",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

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
    
   
    
    //  STEP 3: Simple validation - must be 24 character hex string
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
    
    //  STEP 4: Check if it contains only valid hex characters
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
    
   
    
    //  STEP 5: Create proper ObjectId and search
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
    
    //  STEP 6: Search for bookings
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

    //  STEP 7: Get flight details for each booking (existing code)
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

    //  STEP 8: Process results and return
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



module.exports = {
  createCompleteBooking,
  getBookingById,
  getUserBookings
};
