const express = require('express');

const v1Routes = require('../routes/v1/paymentRoutes');

const router = express.Router();

router.use('/v1/payments', v1Routes);

router.get('/v1/payments/health',(req,res)=>{
    res.status(200).json({
        success: true,
        message : "payment  service is working perfectly",
         status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime()
    })
})

module.exports = router;