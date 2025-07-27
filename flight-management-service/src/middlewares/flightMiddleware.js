function flightMiddleware(req, res, next) {
  const {
    flightNumber,
    airplaneId,
    departureAirportId,
    arrivalAirportId,
    arrivalTime,
    departureTime,
    price,
    boardingGate,
    totalSeats
  } = req.body;

  if (!flightNumber || typeof flightNumber !== "string" || !flightNumber.trim()) {
    return res.status(400).json({ success: false, message: "flightNumber is required and must be a non-empty string." });
  }

  if (!airplaneId || typeof airplaneId !== "string" || !airplaneId.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ success: false, message: "airplaneId is required and must be a valid ObjectId string." });
  }

  if (!departureAirportId || typeof departureAirportId !== "string" || !departureAirportId.match(/^[A-Z]{3}$/)) {
    return res.status(400).json({
      success: false,
      message: "departureAirportId is required and must be a 3-letter uppercase airport code."
    });
  }
  if (!arrivalAirportId || typeof arrivalAirportId !== "string" || !arrivalAirportId.match(/^[A-Z]{3}$/)) {
    return res.status(400).json({
      success: false,
      message: "arrivalAirportId is required and must be a 3-letter uppercase airport code."
    });
  }

  if (!arrivalTime || isNaN(Date.parse(arrivalTime))) {
    return res.status(400).json({ success: false, message: "arrivalTime is required and must be a valid date string." });
  }
  if (!departureTime || isNaN(Date.parse(departureTime))) {
    return res.status(400).json({ success: false, message: "departureTime is required and must be a valid date string." });
  }
  if (new Date(departureTime) >= new Date(arrivalTime)) {
    return res.status(400).json({ success: false, message: "arrivalTime must be after departureTime." });
  }

  if (typeof price !== "number" || price < 0) {
    return res.status(400).json({ success: false, message: "price is required and must be a non-negative number." });
  }

  if (!boardingGate || typeof boardingGate !== "string" || !boardingGate.trim()) {
    return res.status(400).json({ success: false, message: "boardingGate is required and must be a non-empty string." });
  }
  if (typeof totalSeats !== "number" || totalSeats <= 0) {
    return res.status(400).json({ success: false, message: "totalSeats is required and must be a positive number." });
  }
  if (new Date(departureTime) >= new Date(arrivalTime)) {
  return res.status(400).json({
    success: false,
    message: "departureTime must be before arrivalTime."
  });
}

  next();
}

module.exports = flightMiddleware;
