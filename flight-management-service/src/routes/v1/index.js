// src/routes/v1/index.js
const express = require('express');
const InfoRoutes = require('./infoRoutes');

const AirPlaneRoutes = require('./AirPlaneRoutes');
const AirplaneCitiesRoute = require('./AirplaneCitiesRoute')
const AirportRoute = require('./AirportRoute')

const FlightRoute = require('./FlightRoute')



const router = express.Router();

router.use('/airplane', AirPlaneRoutes); // All airplane-related routes
router.use('/info', InfoRoutes);     // All info-related endpoints
router.use('/cities',AirplaneCitiesRoute )  // all cities realated endpoints      //done 
router.use('/airports',AirportRoute)         // all airports releated endpoints 
router.use('/flights',FlightRoute )          // all flights releated to endpoint 

router.get('/health',(req,res)=>{
    res.status(200).json({
        success: true,
        message : "flight management service is working perfectly",
         status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
    })
})
module.exports = router;
