const express = require('express');
const router = express.Router();

const { infoController } = require('../controllers/info-controller');
const bookingRoutes = require('./v1/bookingRoutes');

router.get('/info', infoController);
router.use('/v1/bookings', bookingRoutes);





module.exports = router;
