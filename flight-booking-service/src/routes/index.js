const express = require('express');
const router = express.Router();

const { infoController } = require('../controllers/info-controller');
const bookingRoutes = require('./v1/bookingRoutes');

router.get('/info', infoController);
router.use('/v1/bookings', bookingRoutes);

router.get('/v1/health',(req,res)=>{
    res.status(200).json({
        success: true,
        message : "flight booking  service is working perfectly",
         status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
    })
})


module.exports = router;
