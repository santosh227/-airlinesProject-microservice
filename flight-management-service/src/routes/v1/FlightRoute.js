const express = require('express');
const router = express.Router();

const {
  createFlight,
  getAllFlights,
  getFlight,
  bookSeats,
  getAllFlightsByFilter
} = require('../../controllers/Flight-controller');

const flightMiddleware = require('../../middlewares/flightMiddleware'); // Make sure this path and casing is correct

// More specific route first to avoid route shadowing
router.get('/trips/:departureAirportId-:arrivalAirportId', getAllFlightsByFilter);

// Create a new flight with validation middleware
router.post('/', flightMiddleware, createFlight);

// Get all flights
router.get('/', getAllFlights);

// Get flight by ID
router.get('/:id', getFlight);

// Book seats on flight — route simplified for clarity and correctness
router.post('/:flightId/bookSeats', bookSeats);

module.exports = router;
