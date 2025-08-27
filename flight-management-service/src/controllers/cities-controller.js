const citySchema = require("../models/AirplaneCities");

// CREATE a new citySchema
const createcitySchema = async (req, res) => {
  try {
    const newCity = await citySchema.create(req.body);

    res.status(201).json({ success: true, data: newCity });
  } catch (error) {
    res.status(409).json({
      success: false,
      message: "dublicate city names  cannot be taken ",
    });
  }
};

// READ - Get all cities
const getAllCities = async (req, res) => {
  try {
    const cities = await citySchema.find();
    res.status(200).json({ success: true, data: cities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// READ - Get citySchema by ID
const getcitySchemaById = async (req, res) => {
  try {
    const citySchema = await citySchema.findById(req.params.id);
    if (!citySchema) {
      return res
        .status(404)
        .json({ success: false, message: "citySchema not found" });
    }
    res.status(200).json({ success: true, data: citySchema });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE a citySchema
const updatecitySchema = async (req, res) => {
  try {
    const UpdateCity = await citySchema.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!UpdateCity) {
      return res
        .status(404)
        .json({ success: false, message: "citySchema not found" });
    }
    res.status(200).json({ success: true, data: UpdateCity });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE a citySchema
const deletecitySchema = async (req, res) => {
  try {
    const deletecity = await citySchema.findByIdAndDelete(req.params.id);
    if (!citySchema) {
      return res
        .status(404)
        .json({ success: false, message: "citySchema not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "citySchema deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createcitySchema,
  getAllCities,
  getcitySchemaById,
  updatecitySchema,
  deletecitySchema,
};
