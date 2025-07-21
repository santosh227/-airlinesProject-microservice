// src/routes/v1/index.js
const express = require('express');
const InfoRoutes = require('./infoRoutes');

const AirPlaneRoutes = require('./AirPlaneRoutes');
const AirplaneCitiesRoute = require('./AirplaneCitiesRoute')

const router = express.Router();

router.use('/airplane', AirPlaneRoutes); // All airplane-related routes
router.use('/info', InfoRoutes);     // All info-related endpoints
router.use('/cities',AirplaneCitiesRoute )

module.exports = router;
