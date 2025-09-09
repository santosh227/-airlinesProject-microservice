const citySchema = require('../models/AirplaneCities')

// CREATE a new citySchema
const createCity = async (req, res) => {
  try {
    const newCity = await citySchema.create(req.body);
    res.status(201).json({ 
      success: true, 
      data: newCity 
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (code 11000)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "City with this name already exists. City names must be unique.",
        field: Object.keys(error.keyPattern)[0] // Shows which field caused the duplicate
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Internal server error while creating city",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    const cityById = await citySchema.findById(req.params.id);
    if (!cityById) {
      return res
        .status(404)
        .json({ success: false, message: "city  not found" });
    }
    res.status(200).json({ success: true, data: cityById });
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
        .json({ success: false, message: "city not found" });
    }
    res.status(200).json({ success: "City Details Updated Successfully", data: UpdateCity });
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
      .json({ success: true, message: "city  deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createCity,
  getAllCities,
  getcitySchemaById,
  updatecitySchema,
  deletecitySchema,
};
