const Airport = require("../models/Airport");

// CREATE
exports.createAirport = async (req, res) => {
  try {
    const airport = await Airport.create(req.body);
    res.status(201).json({ success: true, data: airport });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Airport code must be unique." });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// READ ALL
exports.getAllAirports = async (req, res) => {
  try {
    const airports = await Airport.find().populate("city");
    res.status(200).json({ success: true, data: airports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ BY ID
exports.getAirportById = async (req, res) => {
  try {
    const airport = await Airport.findById(req.params.id).populate("city");
    if (!airport) {
      return res
        .status(404)
        .json({ success: false, message: "Airport not found" });
    }
    res.status(200).json({ success: true, data: airport });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE
exports.updateAirport = async (req, res) => {
  try {
    const airport = await Airport.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!airport) {
      return res
        .status(404)
        .json({ success: false, message: "Airport not found" });
    }
    res.status(200).json({ success: true, data: airport });
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Airport code must be unique." });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE
exports.deleteAirport = async (req, res) => {
  try {
    const airport = await Airport.findByIdAndDelete(req.params.id);
    if (!airport) {
      return res
        .status(404)
        .json({ success: false, message: "Airport not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Airport deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
