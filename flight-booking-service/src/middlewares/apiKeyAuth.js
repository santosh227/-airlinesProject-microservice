// API Key Authentication Middleware
const authenticateAPIKey = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid authorization header'
    });
  }
  
  const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Check if API key matches
  if (apiKey !== process.env.BOOKING_SERVICE_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid API key'
    });
  }
  
  next(); // API key is valid, proceed to route handler
};

module.exports = { authenticateAPIKey };
