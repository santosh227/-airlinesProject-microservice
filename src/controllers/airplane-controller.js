const Airplane = require('../models/AirPlaneModel');
// POST AIRPLANE DATA 
const createAirplane = async (req, res) => {
  try {
    const { model, manufacturer, capacity, range, status } = req.body;

    const newAirplane = new Airplane({ model, manufacturer, capacity, range, status });
    const savedAirplane = await newAirplane.save();

    res.status(201).json({
      success: true,
      message: 'Airplane added successfully',
      data: savedAirplane,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add airplane',
      error: error.message,
    });
  }
};

const getAirplane = async (req, res) => {
  try {
    // Fetch all airplanes from the database
    const airplanes = await Airplane.find();

    res.status(200).json({
      success: true,
      message: 'All airplanes fetched successfully.',
      data: airplanes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch airplanes.',
      error: error.message,
    });
  }
};

const getAirplaneById = async (req, res) => {
  try {
    const { id } = req.params;

    const airplane = await Airplane.findById(id);

    if (!airplane) {
      return res.status(404).json({
        success: false,
        message: 'Airplane not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Airplane fetched successfully.',
      data: airplane,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch airplane.',
      error: error.message,
    });
  }
};


const updateAirplaneById = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedAirplane = await Airplane.findByIdAndUpdate(id, updates, {
      new: true,             // return the updated document
      runValidators: true,   // ensure validations are run
    });

    if (!updatedAirplane) {
      return res.status(404).json({
        success: false,
        message: 'Airplane not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Airplane updated successfully.',
      data: updatedAirplane,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update airplane.',
      error: error.message,
    });
  }
};


const deleteAirplaneById = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedAirplane = await Airplane.findByIdAndDelete(id);

    if (!deletedAirplane) {
      return res.status(404).json({
        success: false,
        message: 'Airplane not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Airplane deleted successfully.',
      data: deletedAirplane,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete airplane.',
      error: error.message,
    });
  }
};
module.exports = { createAirplane,
                   getAirplane,
                   getAirplaneById,
                   updateAirplaneById,
                   deleteAirplaneById
 };
