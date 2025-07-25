const Flight = require("../models/Flight");

// CREATE
createFlight = async (req, res) => {
  try {
    const {
      flightNumber,
      airplaneId,
      departureAirportId,
      arrivalAirportId,
      arrivalTime,
      departureTime,
      price,
      boardingGate,
      totalSeats,
    } = req.body;

    const flightcreate = await Flight.create({
      flightNumber,
      airplaneId,
      departureAirportId,
      arrivalAirportId,
      arrivalTime,
      departureTime,
      price,
      boardingGate,
      totalSeats,
    });

    res.status(201).json({ success: true, data: flightcreate });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getAllFlights = async (req, res) => {
  try {
    const getFlights = await Flight.find();
    res.status(200).json({ success: true, data: getFlights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllFlightsByFilter = async (req, res) => {
  try {
    const filter = {};

    if (req.query.trips) {
      const [departure, arrival] = req.query.trips
        .split("-")
        .map((s) => s.trim().toUpperCase());

      if (departure && arrival) {
        filter.departureAirportId = departure;
        filter.arrivalAirportId = arrival;
      }
    }

    if (req.query.departureAirportId) {
      filter.departureAirportId = req.query.departureAirportId.toUpperCase();
    }

    if (req.query.arrivalAirportId) {
      filter.arrivalAirportId = req.query.arrivalAirportId.toUpperCase();
    }

     /////// filter prizes using the max and min 
   if (req.query.priceBetween) {
      const parts = req.query.priceBetween.split('-');
      const min = Number(parts[0]);
      const max = Number(parts[1]);

      if (min && max) {
        filter.price = { $gte: min ,$lte: (max == undefined) ? 400000 :max};
      }
    }
   ///// for number of travellers 
   if (req.query.travellers) {
  filter.totalSeats = { $gte: Number(req.query.travellers) };
}
  // Departure date (gets all flights on that date)
    if (req.query.departureTime) {
      const date = req.query.departureTime;
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      filter.departureTime = { $gte: start, $lte: end };
    }
    const flights = await Flight.find(filter);

    res.status(200).json({ success: true, data: flights });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createFlight, getAllFlights, getAllFlightsByFilter };
