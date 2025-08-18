const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  from: String,
  to: String,
  departDate: String,
  flightNo: String
});

module.exports = mongoose.model('Flight', flightSchema);
