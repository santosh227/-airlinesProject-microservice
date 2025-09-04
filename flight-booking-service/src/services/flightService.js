const axios = require('axios');

// Flight Management Service base URL
const FLIGHT_SERVICE_URL = process.env.FLIGHT_SERVICE_URL || 'http://localhost:3002';

// Get flight details by ID
const getFlightById = async (flightId) => {
  try {
    const response = await axios.get(`${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}`, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Flight service error:', error.message);
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
};

// Check flight availability
const checkFlightAvailability = async (flightId, seats = 1, seatClass = 'all') => {
  try {
    const response = await axios.get(`${FLIGHT_SERVICE_URL}/api/v1/flights/${flightId}/availability`, {
      params: { seats, class: seatClass },
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return {
      success: true,
      available: true,
      data: response.data
    };
  } catch (error) {
    console.error('Flight availability service error:', error.message);
    return {
      success: false,
      available: false,
      error: error.response?.data || error.message
    };
  }
};

module.exports = {
  getFlightById,
  checkFlightAvailability
};
