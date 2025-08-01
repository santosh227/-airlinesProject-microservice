const express = require('express');
const router = express.Router();

// const { infoController } = require('../controllers/info-controller');
const bookingRoutes = require('./v1/bookingRoutes');


router.use('/v1', bookingRoutes);

module.exports = router;
