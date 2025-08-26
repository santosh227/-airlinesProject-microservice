function Airport_middleware(req, res, next) {
  const { airportName, airportCode, airportAddress, city } = req.body;

  if (
    !airportName ||
    typeof airportName !== "string" ||
    airportName.trim().length === 0
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "airportName is required and must be a non-empty string.",
      });
  }
  if (
    !airportCode ||
    typeof airportCode !== "string" ||
    airportCode.trim().length === 0
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "airportCode is required and must be a non-empty string.",
      });
  }
  if (
    !airportAddress ||
    typeof airportAddress !== "string" ||
    airportAddress.trim().length === 0
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message: "airportAddress is required and must be a non-empty string.",
      });
  }
  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          "city is required and must be a non-empty string (ObjectId as string).",
      });
  }

  next();
}

module.exports = Airport_middleware;
