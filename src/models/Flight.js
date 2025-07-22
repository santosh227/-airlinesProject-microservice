const flightSchema = new mongoose.Schema(
  {
    flightNumber: 
    { type: String, required: true },
    airplaneId: { type: mongoose.Schema.Types.ObjectId, ref: "Airplane", required: true },
    departureAirportId: { type: mongoose.Schema.Types.ObjectId, ref: "Airport", required: true },
    arrivalAirportId: { type: mongoose.Schema.Types.ObjectId, ref: "Airport", required: true },
    arrivalTime: { type: Date, required: true },
    departureTime: { type: Date, required: true },
    price: { type: Number, required: true },
    boardingGate: { type: String, required: true },
    totalSeats: { type: Number, required: true },
  },
  { timestamps: true }
);
