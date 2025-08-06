const express = require('express');
const router = express.Router();

const {
  createFlight,
  getAllFlights,
  getFlight,
  bookSeats,
  getAllFlightsByFilter
} = require('../../controllers/Flight-controller');

const flightMiddleware = require('../../middlewares/flightMiddleware')

// Query flights by departure and arrival airport IDs
router.get('/trips/:departureAirportId-:arrivalAirportId', getAllFlightsByFilter);

// Create a new flight with validation middleware
router.post('/', flightMiddleware, createFlight);

// Get all flights
router.get('/', getAllFlights);

// Get flight by ID
router.get('/:id', getFlight);


router.post('/:flightId/bookSeats', bookSeats);

module.exports = router;
