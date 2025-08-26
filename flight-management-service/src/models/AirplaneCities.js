const mongoose = require("mongoose");

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "City name is required"],
    minlength: [2, "City name must be at least 2 characters long"],
    maxlength: [100, "City name must not exceed 100 characters"],
    trim: true,
    unique: true,
  },
  state: {
    type: String,
    required: [true, "State is required"],
    minlength: [2, "State must be at least 2 characters long"],
    maxlength: [100, "State must not exceed 100 characters"],
    trim: true,
  },
  country: {
    type: String,
    required: [true, "Country is required"],
    default: "India",
    trim: true,
  },
  airportCode: {
    type: String,
    required: [true, "Airport code is required"],
    uppercase: true,
    match: [/^[A-Z]{3}$/, "Airport code must be a 3-letter uppercase code"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("City", citySchema);
