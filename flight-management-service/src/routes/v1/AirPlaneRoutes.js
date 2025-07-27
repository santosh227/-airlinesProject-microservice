const express = require('express');
const {
  createAirplane,
  getAirplane,
  getAirplaneById,
  updateAirplaneById,
  deleteAirplaneById
} = require('../../controllers/airplane-controller');

const router = express.Router();

// Create a new airplane
router.post('/', createAirplane);

// Get all airplanes
router.get('/', getAirplane);

// Get airplane by ID
router.get('/:id', getAirplaneById);

// Update airplane by ID
router.put('/:id', updateAirplaneById);

// Delete airplane by ID
router.delete('/:id', deleteAirplaneById);

module.exports = router;
