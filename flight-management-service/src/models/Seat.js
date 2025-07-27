const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  flightId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Flight",
    required: true
  },
  seatNumber: {         // e.g. "12A"
    type: String,
    required: true
  },
  classtype: {              // e.g. "Economy", "Business"
    type: String,
    required: true,
    enum: ["Economy", "Business", "First"],
    default : "Economy"
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  col :{
    type : integer,
    required : true
  },
  row :{
     type : String ,
     required : true
  }
  
}, { timestamps: true });

const Seat = mongoose.model('Seat', seatSchema);

module.exports = Seat;
