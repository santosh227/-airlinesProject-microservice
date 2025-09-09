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
// compound index for better performance
flightSchema.index({ 
  departureAirportId: 1, 
  arrivalAirportId: 1, 
  departureTime: 1,
  price: 1,
  availableSeats: 1 
});


const Flight = mongoose.model("Flight", flightSchema);
module.exports = Flight;
