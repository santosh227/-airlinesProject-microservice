// src/routes/v1/index.js
const express = require('express');
const InfoRoutes = require('./infoRoutes');

const AirPlaneRoutes = require('./AirPlaneRoutes');
const AirplaneCitiesRoute = require('./AirplaneCitiesRoute')
const AirportRoute = require('./AirportRoute')



const router = express.Router();

router.use('/airplane', AirPlaneRoutes); // All airplane-related routes
router.use('/info', InfoRoutes);     // All info-related endpoints
router.use('/cities',AirplaneCitiesRoute )  // all cities realated endpoints 
router.use('/airports',AirportRoute)         // all airports releated endpoints 

module.exports = router;
