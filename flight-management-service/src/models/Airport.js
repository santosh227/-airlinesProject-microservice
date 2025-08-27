const mongoose = require("mongoose");

const airportSchema = new mongoose.Schema({
  airportName: {
    type: String,
    required: true,
    trim: true,
  },
  airportCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  airportAddress: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "City",
    required: true,
  },
});

const Airport = mongoose.model("Airport", airportSchema);
module.exports = Airport;
