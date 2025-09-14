// src/index.js
const PORT = require("./config/index");
const express = require("express");
const apiRoutes = require("./routes/index");
const connectToMongo = require("./utils/index");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRoutes); // Main API prefix


app.get('/flightService/health',(req,res)=>{
    res.status(200).json({
        success: true,
        message : "flight management service is working perfectly",
         status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
    })
})

connectToMongo(); // Connect to MongoDB

app.listen(PORT, () => {
  console.log(` Successfully connected to ${PORT}`);
});
