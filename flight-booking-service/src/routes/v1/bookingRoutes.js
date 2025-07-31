const express = require('express');
const router = express.Router();

const { createBooking } = require('../../controllers/FlightBooking-controller');

router.post('/book', createBooking);

module.exports = router;
