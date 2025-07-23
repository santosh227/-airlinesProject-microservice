const express = require('express');
const router = express.Router();

const {
  createAirport,
  getAllAirports,
  getAirportById,
  updateAirport,
  deleteAirport
} = require('../../controllers/Airport-controller')

// Register handlers (each must be a function)
router.post('/', createAirport);
router.get('/', getAllAirports);
router.get('/:id', getAirportById);
router.put('/:id', updateAirport);
router.delete('/:id', deleteAirport);

module.exports = router;
