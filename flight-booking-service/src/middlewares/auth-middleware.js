const jwt = require("jsonwebtoken");

const authenticateToken = (req, res, next) => {
  console.log(" Authentication middleware triggered"); // Debug log
  
  const authHeader = req.headers["authorization"];
  console.log(" Auth Header:", authHeader); // Debug log
  
  // Better header validation
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(" No valid Bearer token found");
    return res.status(401).json({
      success: false,
      message: "Access token required in Bearer format",
    });
  }

  const token = authHeader.split(" ")[1];
  console.log(" Token extracted:", token ? "Present" : "Missing");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(" Token verified for user:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(" Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: error.name === 'TokenExpiredError' 
        ? "Token has expired" 
        : "Invalid or expired token",
    });
  }
};

module.exports = {authenticateToken};
