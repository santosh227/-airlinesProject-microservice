const express = require("express");
const router = express.Router();
const authenticateUser = require("../../middlewares/auth-middleware");
const {
  createFlight,
  getAllFlights,
  getFlight,
  checkFlightAvailability,
  bookSeats,
  getAllFlightsByFilter,
  releaseSeats,
} = require("../../controllers/Flight-controller");

const flightMiddleware = require("../../middlewares/flightMiddleware");

// Query flights by departure and arrival airport IDs
router.get("/trips/:departureAirportId-:arrivalAirportId",authenticateUser,getAllFlightsByFilter);  // DONE 

// Create a new flight with validation middleware
router.post("/", flightMiddleware, createFlight);  //done 

// Get all flights
router.get("/", authenticateUser, getAllFlights);   // done 

// Get flight by ID
router.get("/:id", authenticateUser, getFlight);   // done 

router.post("/:flightId/bookSeats", bookSeats);   //done 

router.post("/:flightId/releaseSeats", releaseSeats); //done 

router.get("/:id", authenticateUser, getFlight);   // done 

router.get("/:flightId/availability",authenticateUser, checkFlightAvailability);   // done 



module.exports = router;
