const mongoose = require('mongoose');

const validateBookingRequest = (req, res, next) => {
  const { userId, flightId, seats, paymentId } = req.body;
  const errors = [];

  // Check if request body exists
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Request body is missing. Please send JSON data."
    });
  }

  // Check required fields
  if (!userId) errors.push('userId is required');
  if (!flightId) errors.push('flightId is required');
  if (!paymentId) errors.push('paymentId is required');
  
  // Validate seats
  if (!seats || !Array.isArray(seats) || seats.length === 0) {
    errors.push('seats must be a non-empty array');
  } else if (seats.length > 9) {
    errors.push('Cannot book more than 9 seats at once');
  }

  // Validate ObjectId formats
  if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
    errors.push('userId must be a valid MongoDB ObjectId');
  }
  
  if (flightId && !mongoose.Types.ObjectId.isValid(flightId)) {
    errors.push('flightId must be a valid MongoDB ObjectId');
  }

  // Return errors if any
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors
    });
  }

  next();
};

module.exports = {validateBookingRequest};
