const axios = require('axios');
const Booking = require('../models/Booking');

const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://localhost:3000';

const createBooking = async (req, res) => {
  try {
    const { userId, flightId, seats, paymentId } = req.body;
    
    if (!userId || !flightId || !seats || !paymentId) {
      return res.status(400).json({ 
        message: "Missing required fields: userId, flightId, seats, paymentId" 
      });
    }

    const seatsToBook = seats.length;

    // Get flight details
    const flightResponse = await axios.get(`${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}`);
    const pricePerSeat = flightResponse.data.data.price;
    
    // Book seats through Flight service
    const bookingResponse = await axios.post(
      `${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/bookSeats`,
      { seatsToBook }
    );

    if (!bookingResponse.data.success) {
      return res.status(400).json({ 
        message: bookingResponse.data.message || "Not enough seats available" 
      });
    }

    const totalCost = pricePerSeat * seatsToBook;

    // Create booking document
    const booking = await Booking.create({
      userId,
      flightId,
      seats,
      price: totalCost,
      paymentId,
      status: "confirmed",
      bookedAt: new Date()
    });

    res.status(201).json({ 
      message: "Booking successful", 
      booking,
      pricingBreakdown: {
        seatsBooked: seatsToBook,
        pricePerSeat: pricePerSeat,
        totalCost: totalCost
      }
    });

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ 
      message: "Booking failed", 
      error: error.message 
    });
  }
};

module.exports = { createBooking };
