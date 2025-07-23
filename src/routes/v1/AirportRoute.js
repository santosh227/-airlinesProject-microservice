const express = require("express");
const router = express.Router();

const {
  createAirport,
  getAllAirports,
  getAirportById,
  updateAirport,
  deleteAirport,
} = require("../../controllers/Airport-controller");

const Airport_middleware = require("../../middlewares/Airport_middleware");

router.post("/", Airport_middleware, createAirport);
router.get("/", getAllAirports);
router.get("/:id", getAirportById);
router.put("/:id", updateAirport);
router.delete("/:id", deleteAirport);

module.exports = router;
