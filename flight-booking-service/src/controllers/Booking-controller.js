const axios = require('axios');
const Booking = require('../models/Booking');
const mongoose = require('mongoose');

const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://localhost:3000';

// Create complete booking with database storage
const createCompleteBooking = async (req, res) => {
  try {
    // ✅ STEP 1: Initial request debugging and validation
    console.log('=== BOOKING REQUEST DEBUG ===');
    console.log('Request body:', req.body);
    console.log('Request headers Content-Type:', req.get('Content-Type'));
    console.log('Body exists:', !!req.body);
    console.log('Body keys:', req.body ? Object.keys(req.body) : 'NO BODY');
    console.log('============================');

    // Safe validation
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

    // ✅ STEP 2: Safe destructuring with fallback
    const {
      userId = null,
      flightId = null,
      seats = null,
      paymentId = null
    } = req.body;

    // ✅ STEP 3: Detailed field validation
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

    // ✅ STEP 4: Validate ObjectId formats
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

    // ✅ STEP 5: PRE-BOOKING AVAILABILITY CHECK (NEW FEATURE)
    console.log('🔍 Performing pre-booking availability check...');
    const availabilityCheck = await checkAvailabilityBeforeBooking(flightId, seatsToBook);
    
    if (!availabilityCheck.available) {
      console.log('❌ Availability check failed:', availabilityCheck.message);
      
      return res.status(400).json({
        success: false,
        message: "Seats no longer available for booking",
        reason: "insufficient_availability",
        availabilityInfo: {
          requestedSeats: seatsToBook,
          availableSeats: availabilityCheck.data?.availability?.availableSeats || 0,
          flightStatus: availabilityCheck.data?.availability?.status || 'unknown',
          urgencyMessage: availabilityCheck.data?.availability?.urgencyMessage || null
        },
        suggestions: {
          alternativeOptions: availabilityCheck.data?.bookingGuidance?.alternativeOptions || null,
          recommendedAction: availabilityCheck.data?.bookingGuidance?.recommendedAction || 'try_different_flight'
        },
        pricing: availabilityCheck.data?.pricing || null
      });
    }

    console.log('✅ Availability check passed, proceeding with booking...');
    console.log('💡 Available seats:', availabilityCheck.data?.availability?.availableSeats);

    // ✅ STEP 6: Call Flight service to book seats
    console.log(`🛫 Calling Flight Service: ${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/bookSeats`);
    
    let bookingResponse;
    try {
      bookingResponse = await axios.post(
        `${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/bookSeats`,
        { seatsToBook },
        {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (axiosError) {
      console.error('❌ Flight Service Error:', axiosError.message);
      
      if (axiosError.response) {
        return res.status(axiosError.response.status || 400).json({
          success: false,
          message: axiosError.response.data?.message || "Flight service error",
          flightServiceError: axiosError.response.data,
          errorType: "flight_service_error"
        });
      } else if (axiosError.code === 'ECONNREFUSED') {
        return res.status(503).json({
          success: false,
          message: "Flight Management Service is not available. Please ensure it's running on port 3000.",
          error: "SERVICE_UNAVAILABLE"
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to connect to Flight Management Service",
          error: axiosError.message
        });
      }
    }

    // ✅ STEP 7: Validate Flight service response
    if (!bookingResponse.data || !bookingResponse.data.success) {
      return res.status(400).json({
        success: false,
        message: bookingResponse.data?.message || "Seat booking failed",
        flightServiceResponse: bookingResponse.data
      });
    }

    const flightData = bookingResponse.data.flight;
    const bookingDetails = bookingResponse.data.bookingDetails;

    if (!flightData || !bookingDetails) {
      return res.status(500).json({
        success: false,
        message: "Invalid response from Flight service - missing flight data or booking details",
        received: bookingResponse.data
      });
    }

    // ✅ STEP 8: Generate unique booking reference
    console.log('🎫 Generating booking reference...');
    const bookingReference = await generateUniqueReference(
      flightData.flightNumber,
      flightData.arrivalAirportId,
      new Date()
    );

    console.log(`📋 Booking reference generated: ${bookingReference}`);

    // ✅ STEP 9: Store complete booking in database
    let booking;
    try {
      booking = await Booking.create({
        userId: new mongoose.Types.ObjectId(userId),
        flightId: new mongoose.Types.ObjectId(flightId),
        seats,
        price: bookingDetails.totalCost,
        paymentId,
        bookingReference,
        status: "confirmed",
        bookedAt: new Date(),
        seatsBooked: bookingDetails.seatsBooked,
        pricePerSeat: bookingDetails.pricePerSeat,
        totalCost: bookingDetails.totalCost
      });
    } catch (dbError) {
      console.error('❌ Database Error:', dbError);
      return res.status(500).json({
        success: false,
        message: "Failed to create booking record in database",
        error: dbError.message
      });
    }

    console.log(`✅ Booking created successfully with reference: ${booking.bookingReference}`);

    // ✅ STEP 10: Return comprehensive success response
    res.status(201).json({
      success: true,
      message: "Booking completed and stored successfully",
      booking: {
        _id: booking._id,
        bookingReference: booking.bookingReference,
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
        previousSeats: flightData.availableSeats + seatsToBook,
        seatsJustBooked: seatsToBook
      },
      pricingBreakdown: {
        seatsBooked: bookingDetails.seatsBooked,
        pricePerSeat: bookingDetails.pricePerSeat,
        totalCost: bookingDetails.totalCost,
        message: bookingDetails.message
      },
      availabilityInfo: {
        checkedAt: new Date().toISOString(),
        seatsAvailableAtBooking: availabilityCheck.data?.availability?.availableSeats,
        demandLevel: availabilityCheck.data?.pricing?.demandLevel,
        occupancyPercentage: availabilityCheck.data?.pricing?.occupancyPercentage
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Unexpected booking error:', error);
    res.status(500).json({
      success: false,
      message: "An unexpected error occurred during booking",
      error: error.message,
      errorType: "internal_server_error"
    });
  }
};

// ✅ HELPER FUNCTION: Check availability before booking (NEW)
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

// ✅ STANDALONE AVAILABILITY ENDPOINT (NEW)
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
  getFlightAvailability,
  getBookingByReference
};

