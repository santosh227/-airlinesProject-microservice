// src/routes/v1/infoRoutes.js
const express = require("express");
const { info } = require("../../controllers/info-controller");

const router = express.Router();

router.get("/", info); // or use the appropriate method from your controller

module.exports = router;
