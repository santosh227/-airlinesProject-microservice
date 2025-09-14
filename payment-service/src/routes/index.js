const express = require('express');

const v1Routes = require('../routes/v1/paymentRoutes');

const router = express.Router();

router.use('/v1/payments', v1Routes);


module.exports = router;