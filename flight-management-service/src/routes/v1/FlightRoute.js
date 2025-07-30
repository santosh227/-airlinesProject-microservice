const express = require('express');
const router = express.Router();

const {createFlight,getAllFlightsByFilter,getFlight} = require('../../controllers/Flight-controller')// Destructure to get the function
const flightMiddleware = require('../../middlewares/flightMiddleware')   // fix the case if needed

router.post('/',flightMiddleware, createFlight);
router.get('/', getAllFlightsByFilter);
router.get('/:id', getFlight);
router.get('/trips/:departureAirportId-:arrivalAirportId', getAllFlightsByFilter);


module.exports = router;

