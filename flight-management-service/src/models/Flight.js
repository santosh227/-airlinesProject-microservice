const mongoose = require("mongoose");

const flightSchema = new mongoose.Schema(
  {
    flightNumber: {
      type: String,
      required: true,
    },
    airplaneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Airplane",
      required: true,
    },
    departureAirportId: {
      type: String,
      required: true,
      uppercase: true,
      match: [/^[A-Z]{3}$/],
    },
    arrivalAirportId: {
      type: String,
      required: true,
      uppercase: true,
      match: [/^[A-Z]{3}$/],
    },
    arrivalTime: {
      type: Date,
      required: true,
    },
    departureTime: {
      type: Date,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    boardingGate: {
      type: String,
      required: true,
    },
    totalSeats: { type: Number, required: true },
    availableSeats: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Flight = mongoose.model("Flight", flightSchema);
module.exports = Flight;
