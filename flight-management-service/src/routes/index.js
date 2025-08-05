// src/routes/index.js
const express = require('express');
const v1Routes = require('./v1');


const router = express.Router();

router.use('/v1', v1Routes); // Now `/api/v1/...` will work

module.exports = router;
