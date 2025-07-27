const express = require('express');
const {
  createcitySchema,
  getAllCities,
  getcitySchemaById,
  updatecitySchema,
  deletecitySchema
} = require('../../controllers/cities-controller')

const router = express.Router();

// Create a new airplane
router.post('/', createcitySchema);

// Get all airplanes
router.get('/', getAllCities);

// Get airplane by ID
router.get('/:id', getcitySchemaById);

// Update airplane by ID
router.patch('/:id', updatecitySchema);

// Delete airplane by ID
router.delete('/:id', deletecitySchema);

module.exports = router;