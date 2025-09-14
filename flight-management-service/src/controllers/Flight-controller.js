const mongoose = require("mongoose");
const Flight = require("../models/Flight");
const Airport = require("../models/Airport");
const Airplane = require("../models/AirPlanes");

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
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required flight details.",
        });
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
      return res
        .status(404)
        .json({ success: false, message: "Flight not found." });
    }

    const depAirport = await Airport.findOne({
      airportCode: flight.departureAirportId,
    });
    const arrAirport = await Airport.findOne({
      airportCode: flight.arrivalAirportId,
    });
    const airplane = await Airplane.findById(flight.airplaneId);

    const enrichedFlight = {
      ...flight.toObject(),
      departureAirport: depAirport,
      arrivalAirport: arrAirport,
      airplane: airplane,
    };

    res.status(200).json({ success: true, data: enrichedFlight });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
// Flights availability future
const checkFlightAvailability = async (req, res) => {
  try {
    const { flightId } = req.params;
    const { seats = 1 } = req.query;

    // This will now work because mongoose is imported
    if (!mongoose.Types.ObjectId.isValid(flightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid flight ID format",
      });
    }

    const requestedSeats = parseInt(seats);
    if (isNaN(requestedSeats) || requestedSeats <= 0 || requestedSeats > 50) {
      return res.status(400).json({
        success: false,
        message: "Invalid number of seats requested. Must be between 1 and 50.",
        received: seats,
      });
    }

    const flight = await Flight.findById(flightId);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: "Flight not found",
      });
    }

    const currentTime = new Date();
    const departureTime = new Date(flight.departureTime);
    const minutesUntilDeparture = (departureTime - currentTime) / (1000 * 60);

    if (minutesUntilDeparture < 30) {
      return res.status(409).json({
        success: false,
        available: false,
        message: "Flight is no longer available for booking",
        reason: "departure_imminent",
        departureTime: flight.departureTime,
        minutesUntilDeparture: Math.round(minutesUntilDeparture),
      });
    }

    const availableSeats = flight.availableSeats;
    const canBook = availableSeats >= requestedSeats;

    const totalSeats = flight.totalSeats || 180;
    const occupancyPercentage = Math.round(
      ((totalSeats - availableSeats) / totalSeats) * 100
    );

    let availabilityStatus = "available";
    let urgencyMessage = null;

    if (availableSeats === 0) {
      availabilityStatus = "sold_out";
    } else if (availableSeats <= 5) {
      availabilityStatus = "limited";
      urgencyMessage = `Only ${availableSeats} seats remaining!`;
    } else if (availableSeats <= 20) {
      availabilityStatus = "filling_fast";
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
      message: canBook
        ? "Seats available for booking"
        : "Insufficient seats available",
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
        urgencyMessage: urgencyMessage,
      },
      timing: {
        departureTime: flight.departureTime,
        currentTime: currentTime.toISOString(),
        minutesUntilDeparture: Math.round(minutesUntilDeparture),
        hoursUntilDeparture:
          Math.round((minutesUntilDeparture / 60) * 100) / 100,
      },
      pricing: {
        basePrice: flight.price,
        estimatedPrice: estimatedPrice,
        pricePerSeat: estimatedPrice,
        totalEstimatedCost: estimatedPrice * requestedSeats,
        occupancyPercentage: occupancyPercentage,
        demandLevel:
          occupancyPercentage > 80
            ? "high"
            : occupancyPercentage > 50
            ? "medium"
            : "low",
      },
      bookingGuidance: {
        recommendedAction: canBook ? "proceed_to_book" : "select_fewer_seats",
        alternativeOptions:
          !canBook && availableSeats > 0
            ? `Try booking ${availableSeats} seat${
                availableSeats === 1 ? "" : "s"
              } instead`
            : null,
        bookingDeadline: `Booking closes ${Math.round(
          minutesUntilDeparture
        )} minutes before departure`,
      },
    });
  } catch (error) {
    console.error("Flight availability check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check flight availability",
      error: error.message,
    });
  }
};

// flight-service/routes/flightRoutes.js
const bookSeats = async (req, res) => {
  const { flightId } = req.params;
  const { seatsToBook } = req.body;

  if (!Number.isInteger(seatsToBook) || seatsToBook <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid seatsToBook value" });
  }

  try {
    const updatedFlight = await Flight.findOneAndUpdate(
      { _id: flightId, availableSeats: { $gte: seatsToBook } },
      { $inc: { availableSeats: -seatsToBook } },
      { new: true }
    );

    if (!updatedFlight) {
      return res
        .status(409)
        .json({ success: false, message: "Not enough seats available" });
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
        message: `Successfully booked ${seatsToBook} seats for ₹${totalCost.toLocaleString()}`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllFlightsByFilter = async (req, res) => {
  try {
    const { departureAirportId, arrivalAirportId } = req.params;
    const { trips, priceBetween, travellers, departureTime } = req.query;

    // Determine airport codes
    let depCode = departureAirportId?.toUpperCase();
    let arrCode = arrivalAirportId?.toUpperCase();

    if (trips) {
      const [dep, arr] = trips.split('-').map(s => s.trim().toUpperCase());
      depCode = dep || depCode;
      arrCode = arr || arrCode;
    }

    if (req.query.departureAirportId) depCode = req.query.departureAirportId.toUpperCase();
    if (req.query.arrivalAirportId) arrCode = req.query.arrivalAirportId.toUpperCase();

    if (!depCode || !arrCode) {
      return res.status(400).json({
        success: false,
        message: 'Both departure and arrival airport codes are required'
      });
    }

    // Build match conditions
    const matchConditions = {
      departureAirportId: depCode,
      arrivalAirportId: arrCode
    };

    // Add filters
    if (priceBetween) {
      const [min, max] = priceBetween.split('-').map(Number);
      if (!isNaN(min)) {
        matchConditions.price = { $gte: min };
        if (!isNaN(max)) matchConditions.price.$lte = max;
      }
    }

    if (travellers) {
      const count = Number(travellers);
      if (!isNaN(count) && count > 0) {
        matchConditions.availableSeats = { $gte: count };
      }
    }

    if (departureTime) {
      const start = new Date(`${departureTime}T00:00:00.000Z`);
      const end = new Date(`${departureTime}T23:59:59.999Z`);
      matchConditions.departureTime = { $gte: start, $lte: end };
    }

    const pipeline = [
      { $match: matchConditions },
      
      // Single lookup for departure airport
      {
        $lookup: {
          from: 'airports', 
          localField: 'departureAirportId', 
          foreignField: 'airportCode',
          as: 'departureAirport'
        }
      },
      { $unwind: { path: '$departureAirport', preserveNullAndEmptyArrays: true } },
      
      // Single lookup for arrival airport
      {
        $lookup: {
          from: 'airports', 
          localField: 'arrivalAirportId',
          foreignField: 'airportCode',
          as: 'arrivalAirport'
        }
      },
      { $unwind: { path: '$arrivalAirport', preserveNullAndEmptyArrays: true } },
      
      // Single lookup for airplane
      {
        $lookup: {
          from: 'airplanes', 
          localField: 'airplaneId',
          foreignField: '_id',
          as: 'airplane'
        }
      },
      { $unwind: { path: '$airplane', preserveNullAndEmptyArrays: true } },
      
      // Sort by departure time
      { $sort: { departureTime: 1 } }
    ];

    const flights = await Flight.aggregate(pipeline);
    
    console.log(` Found ${flights.length} flights`);

    //   Handle empty results with clear message
    if (flights.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No flights available/active for your search",
        data: [],
        searchCriteria: {
          route: `${depCode} → ${arrCode}`,
          ...(priceBetween && { priceRange: priceBetween }),
          ...(travellers && { travellers: Number(travellers) }),
          ...(departureTime && { departureDate: departureTime })
        }
      });
    }

    // Return successful results
    res.status(200).json({
      success: true,
      data: flights,
      count: flights.length
    });

  } catch (error) {
    console.error('🚨 Aggregation Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } 
};


/// Booking cancellation
const releaseSeats = async (req, res) => {
  try {
    const { flightId } = req.params;
    const { seatsToRelease } = req.body;

    // Validation
    if (!seatsToRelease || seatsToRelease <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid seatsToRelease value. Must be a positive number.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(flightId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid flight ID format",
      });
    }

    // Find and update flight
    const flight = await Flight.findById(flightId);
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: "Flight not found",
      });
    }

    // Release seats (add back to available seats)
    const previousAvailableSeats = flight.availableSeats;
    flight.availableSeats += seatsToRelease;

    // Ensure we don't exceed total seats
    if (flight.availableSeats > flight.totalSeats) {
      flight.availableSeats = flight.totalSeats;
    }

    await flight.save();

    res.status(200).json({
      success: true,
      message: "Seats released successfully",
      flight: {
        id: flight._id,
        flightNumber: flight.flightNumber,
        availableSeats: flight.availableSeats,
        totalSeats: flight.totalSeats,
        previousAvailableSeats: previousAvailableSeats,
        seatsReleased: seatsToRelease,
      },
    });
  } catch (error) {
    console.error(" Error releasing seats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to release seats",
      error: error.message,
    });
  }
};



module.exports = {
  createFlight,
  getAllFlights,
  getFlight,
  checkFlightAvailability,
  bookSeats,
  getAllFlightsByFilter,
  releaseSeats
};
