const Flight = require('../models/Flight')

// CREATE
createFlight = async (req, res) => {
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
      totalSeats
    } = req.body;

    const flightcreate = await Flight.create({
      flightNumber,
      airplaneId,
      departureAirportId,
      arrivalAirportId,
      arrivalTime,
      departureTime,
      price,
      boardingGate,
      totalSeats
    });

    res.status(201).json({ success: true, data: flightcreate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAllFlights = async (req, res) => {
  try {
    const getFlights = await Flight.find();
    res.status(200).json({ success: true, data: getFlights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Controller:
// This function handles GET requests to /api/v1/flights
// It can filter flights based on query parameters like ?trips=BOM-DEL, ?departureAirportId=DEL, etc.

const getAllFlightsByFilter = async (req, res) => {
  try {
    // 1. Create an empty filter object (will hold our search criteria)
    const filter = {};

    // 2. Support searching with a trips param (e.g. ?trips=BOM-DEL)
    //    This lets a user specify both the departure and arrival in one query param
    if (req.query.trips) {
      // Split the trips string into two parts (e.g. BOM-DEL => ['BOM', 'DEL'])
      const [departure, arrival] = req.query.trips
        .split('-')
        .map(s => s.trim().toUpperCase()); // Remove spaces and make uppercase

      // If both codes exist, add them to the filter
      if (departure && arrival) {
        filter.departureAirportId = departure;
        filter.arrivalAirportId = arrival;
      }
    }

    // 3. Support individual search params too (e.g. ?departureAirportId=DEL)
    //    This is useful if you only want to filter by one value, or want flexibility
    if (req.query.departureAirportId) {
      filter.departureAirportId = req.query.departureAirportId.toUpperCase();
    }

    if (req.query.arrivalAirportId) {
      filter.arrivalAirportId = req.query.arrivalAirportId.toUpperCase();
    }

    // 4. Now, search the Flight collection using the built filter
    //    If filter is empty (no query params), this will return all flights
    const flights = await Flight.find(filter);

    // 5. Send the matching flights back as JSON
    res.status(200).json({ success: true, data: flights });

  } catch (error) {
    // If something goes wrong, send an error response
    res.status(500).json({ success: false, message: error.message });
  }
};






module.exports = {createFlight,getAllFlights,getAllFlightsByFilter
}

