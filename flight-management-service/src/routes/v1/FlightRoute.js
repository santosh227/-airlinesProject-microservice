const express = require('express');
const router = express.Router();
const authenticateUser = require('../../middlewares/auth-middleware');
const {
  createFlight,
  getAllFlights,
  getFlight,
  checkFlightAvailability,
  bookSeats,
  getAllFlightsByFilter
} = require('../../controllers/Flight-controller');

const flightMiddleware = require('../../middlewares/flightMiddleware')

// Query flights by departure and arrival airport IDs
router.get('/trips/:departureAirportId-:arrivalAirportId', getAllFlightsByFilter);

// Create a new flight with validation middleware
router.post('/', flightMiddleware, createFlight);

// Get all flights
router.get('/', authenticateUser, getAllFlights);

// Get flight by ID
router.get('/:id',authenticateUser, getFlight);


router.post('/:flightId/bookSeats', bookSeats);


router.get('/:flightId/availability', checkFlightAvailability);

module.exports = router;
