const mongoose = require('mongoose');
const Flight = require("../models/Flight");
const Airport = require("../models/Airport");
const Airplane = require('../models/AirPlanes')

// CREATE Flight - sets availableSeats = totalSeats initially
const createFlight = async (req, res) => {
  try {
    const {
      flightNumber,
      airplaneId,
      departureAirportId,
      arrivalAirportId,
      arrivalTime,
      departureTime,
      price,
      boardingGate,
      totalSeats,
    } = req.body;

    if (
      !flightNumber ||
      !airplaneId ||
      !departureAirportId ||
      !arrivalAirportId ||
      !arrivalTime ||
      !departureTime ||
      price == null ||
      !boardingGate ||
      !totalSeats
    ) {
      return res.status(400).json({ success: false, message: 'Please provide all required flight details.' });
    }

    // Create flight with availableSeats initialized
    const flightCreate = await Flight.create({
      flightNumber,
      airplaneId,
      departureAirportId: departureAirportId.toUpperCase(),
      arrivalAirportId: arrivalAirportId.toUpperCase(),
      arrivalTime,
      departureTime,
      price,
      boardingGate,
      totalSeats,
      availableSeats: totalSeats,
    });

    res.status(201).json({ success: true, data: flightCreate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get all flights (simple)
const getAllFlights = async (req, res) => {
  try {
    const getFlights = await Flight.find();
    res.status(200).json({ success: true, data: getFlights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single flight by ID with enriched airport & airplane info
const getFlight = async (req, res) => {
  try {
    const { id } = req.params;
    const flight = await Flight.findById(id);

    if (!flight) {
      return res.status(404).json({ success: false, message: 'Flight not found.' });
    }

    const depAirport = await Airport.findOne({ airportCode: flight.departureAirportId });
    const arrAirport = await Airport.findOne({ airportCode: flight.arrivalAirportId });
    const airplane = await Airplane.findById(flight.airplaneId);

    const enrichedFlight = {
      ...flight.toObject(),
      departureAirport: depAirport,
      arrivalAirport: arrAirport,
      airplane: airplane,
    };

    res.status(200).json({ success: true, data: enrichedFlight });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
// Flights availability future 
const checkFlightAvailability = async (req, res) => {
  try {
    const { flightId } = req.params;
    const { seats = 1 } = req.query;

    console.log(`Checking availability for flight ${flightId}, requested seats: ${seats}`);

    // This will now work because mongoose is imported
    if (!mongoose.Types.ObjectId.isValid(flightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid flight ID format"
      });
    }

    const requestedSeats = parseInt(seats);
    if (isNaN(requestedSeats) || requestedSeats <= 0 || requestedSeats > 50) {
      return res.status(400).json({
        success: false,
        message: "Invalid number of seats requested. Must be between 1 and 50.",
        received: seats
      });
    }

    const flight = await Flight.findById(flightId);
    
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: "Flight not found"
      });
    }

    const currentTime = new Date();
    const departureTime = new Date(flight.departureTime);
    const minutesUntilDeparture = (departureTime - currentTime) / (1000 * 60);

    if (minutesUntilDeparture < 30) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Flight is no longer available for booking",
        reason: "departure_imminent",
        departureTime: flight.departureTime,
        minutesUntilDeparture: Math.round(minutesUntilDeparture)
      });
    }

    const availableSeats = flight.availableSeats;
    const canBook = availableSeats >= requestedSeats;
    
    const totalSeats = flight.totalSeats || 180;
    const occupancyPercentage = Math.round(((totalSeats - availableSeats) / totalSeats) * 100);

    let availabilityStatus = 'available';
    let urgencyMessage = null;

    if (availableSeats === 0) {
      availabilityStatus = 'sold_out';
    } else if (availableSeats <= 5) {
      availabilityStatus = 'limited';
      urgencyMessage = `Only ${availableSeats} seats remaining!`;
    } else if (availableSeats <= 20) {
      availabilityStatus = 'filling_fast';
      urgencyMessage = `${availableSeats} seats left. Book soon!`;
    }

    let estimatedPrice = flight.price;
    if (occupancyPercentage > 80) {
      estimatedPrice = Math.round(flight.price * 1.1);
    } else if (occupancyPercentage < 30) {
      estimatedPrice = Math.round(flight.price * 0.9);
    }

    res.status(200).json({
      success: true,
      available: canBook,
      message: canBook ? "Seats available for booking" : "Insufficient seats available",
      availability: {
        flightId: flight._id,
        flightNumber: flight.flightNumber,
        route: `${flight.departureAirportId} → ${flight.arrivalAirportId}`,
        departureTime: flight.departureTime,
        requestedSeats: requestedSeats,
        availableSeats: availableSeats,
        totalSeats: totalSeats,
        canBook: canBook,
        status: availabilityStatus,
        urgencyMessage: urgencyMessage
      },
      timing: {
        departureTime: flight.departureTime,
        currentTime: currentTime.toISOString(),
        minutesUntilDeparture: Math.round(minutesUntilDeparture),
        hoursUntilDeparture: Math.round(minutesUntilDeparture / 60 * 100) / 100
      },
      pricing: {
        basePrice: flight.price,
        estimatedPrice: estimatedPrice,
        pricePerSeat: estimatedPrice,
        totalEstimatedCost: estimatedPrice * requestedSeats,
        occupancyPercentage: occupancyPercentage,
        demandLevel: occupancyPercentage > 80 ? 'high' : occupancyPercentage > 50 ? 'medium' : 'low'
      },
      bookingGuidance: {
        recommendedAction: canBook ? 'proceed_to_book' : 'select_fewer_seats',
        alternativeOptions: !canBook && availableSeats > 0 ? 
          `Try booking ${availableSeats} seat${availableSeats === 1 ? '' : 's'} instead` : null,
        bookingDeadline: `Booking closes ${Math.round(minutesUntilDeparture)} minutes before departure`
      }
    });

  } catch (error) {
    console.error('Flight availability check error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to check flight availability",
      error: error.message
    });
  }
};

// flight-service/routes/flightRoutes.js
const bookSeats = async (req, res) => {
  const { flightId } = req.params;
  const { seatsToBook } = req.body;

  if (!Number.isInteger(seatsToBook) || seatsToBook <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid seatsToBook value' });
  }

  try {
    const updatedFlight = await Flight.findOneAndUpdate(
      { _id: flightId, availableSeats: { $gte: seatsToBook } },
      { $inc: { availableSeats: -seatsToBook } },
      { new: true }
    );

    if (!updatedFlight) {
      return res.status(400).json({ success: false, message: 'Not enough seats available' });
    }

    // Calculate pricing details
    const pricePerSeat = updatedFlight.price;
    const totalCost = pricePerSeat * seatsToBook;

    res.json({ 
      success: true, 
      flight: updatedFlight,
      bookingDetails: {
        seatsBooked: seatsToBook,
        pricePerSeat: pricePerSeat,
        totalCost: totalCost,
        message: `Successfully booked ${seatsToBook} seats for ₹${totalCost.toLocaleString()}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get flights by filters with enrichment
const getAllFlightsByFilter = async (req, res) => {
  try {
    const filter = {};

    // TRIPS (e.g., DEL-MUI)
    if (req.query.trips) {
      const [departure, arrival] = req.query.trips.split("-").map(s => s.trim().toUpperCase());
      if (departure && arrival) {
        filter.departureAirportId = departure;
        filter.arrivalAirportId = arrival;
      }
    }

    if (req.query.departureAirportId) {
      filter.departureAirportId = req.query.departureAirportId.toUpperCase();
    }
    if (req.query.arrivalAirportId) {
      filter.arrivalAirportId = req.query.arrivalAirportId.toUpperCase();
    }

    // PRICE RANGE
    if (req.query.priceBetween) {
      const [min, max] = req.query.priceBetween.split("-").map(Number);
      if (!isNaN(min)) {
        filter.price = { $gte: min };
        if (!isNaN(max)) filter.price.$lte = max;
      }
    }

    // TRAVELLERS filter using availableSeats instead of totalSeats to show truly available
    if (req.query.travellers) {
      filter.availableSeats = { $gte: Number(req.query.travellers) };
    }

    // DEPARTURE DATE FILTER
    if (req.query.departureTime) {
      const date = req.query.departureTime;
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      filter.departureTime = { $gte: start, $lte: end };
    }

    const flights = await Flight.find(filter);

    // Optimization: fetch all referenced airports & airplanes once
    const airportCodes = new Set();
    const airplaneIds = new Set();
    flights.forEach(flight => {
      airportCodes.add(flight.departureAirportId);
      airportCodes.add(flight.arrivalAirportId);
      airplaneIds.add(String(flight.airplaneId));
    });

    const airports = await Airport.find({ airportCode: { $in: Array.from(airportCodes) } });
    const airplanes = await Airplane.find({ _id: { $in: Array.from(airplaneIds) } });

    // Map for quick lookup
    const airportMap = airports.reduce((acc, curr) => {
      acc[curr.airportCode] = curr;
      return acc;
    }, {});

    const airplaneMap = airplanes.reduce((acc, curr) => {
      acc[curr._id] = curr;
      return acc;
    }, {});

    // Build enriched response
    const enriched = flights.map(flight => ({
      ...flight.toObject(),
      departureAirport: airportMap[flight.departureAirportId] || null,
      arrivalAirport: airportMap[flight.arrivalAirportId] || null,
      airplane: airplaneMap[flight.airplaneId] || null,
    }));

    res.status(200).json({ success: true, data: enriched });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createFlight, getAllFlights, getFlight,checkFlightAvailability,bookSeats, getAllFlightsByFilter };


