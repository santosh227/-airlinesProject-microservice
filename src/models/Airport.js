const mongoose = require('mongoose');

// Define the schema for an airport
const AirportSchema = new mongoose.Schema({
  // Name of the airport
  name: {
    type: String,
    required: true
  },
  // Unique code for the airport
  code: {
    type: String,
    required: true,
    unique: true
  },
  // Physical address of the airport
  address: {
    type: String,
    required: true
  },
  // Reference to the City (foreign key)
  cityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",             // <--- Links to your City model
    required: true
  }
});

// Create the Airport model
const Airport = mongoose.model('Airport', AirportSchema);
module.exports = Airport;
