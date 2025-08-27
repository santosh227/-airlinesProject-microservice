const mongoose = require("mongoose");

const airplaneSchema = new mongoose.Schema({
  model: String,
  manufacturer: String,
  capacity: Number,
  range: String,
  status: String,
});

const Airplane = mongoose.model("Airplane", airplaneSchema);

module.exports = Airplane;
