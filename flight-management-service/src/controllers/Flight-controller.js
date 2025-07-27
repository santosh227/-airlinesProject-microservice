const Flight = require("../models/Flight");
const Airport = require("../models/Airport");
const Airplane = require('../models/AirPlanes')

// CREATE
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

    const flightcreate = await Flight.create({
      flightNumber,
      airplaneId,
      departureAirportId,
      arrivalAirportId,
      arrivalTime,
      departureTime,
      price,
      boardingGate,
      totalSeats,
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

    // PRICE BETWEEN
    if (req.query.priceBetween) {
      const [min, max] = req.query.priceBetween.split("-").map(Number);
      if (!isNaN(min)) {
        filter.price = { $gte: min };
        if (!isNaN(max)) filter.price.$lte = max;
      }
    }

    // TRAVELLERS
    if (req.query.travellers) {
      filter.totalSeats = { $gte: Number(req.query.travellers) };
    }

    // DEPARTURE DATE
    if (req.query.departureTime) {
      const date = req.query.departureTime;
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      filter.departureTime = { $gte: start, $lte: end };
    }

    const flights = await Flight.find(filter);
    const enriched = [];

    for (let flight of flights) {
      // NOTE: Use 'airportCode' not 'code'!
      const depAirport = await Airport.findOne({ airportCode: flight.departureAirportId });
      const arrAirport = await Airport.findOne({ airportCode: flight.arrivalAirportId });
      const airplane = await Airplane.findById(flight.airplaneId);

      enriched.push({
        ...flight.toObject(),
        departureAirport: depAirport,
        arrivalAirport: arrAirport,
        airplane: airplane
      });
    }
    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createFlight, getAllFlights, getAllFlightsByFilter };
