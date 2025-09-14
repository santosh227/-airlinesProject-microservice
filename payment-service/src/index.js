const express = require('express');
const apiRoutes = require('./routes');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose')
const dotenv = require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5004;


// Security middleware
app.use(helmet());
app.use(cors());
//Handle webhook endpoint with RAW body BEFORE other body parsing
// app.use('/api/v1/webhook', express.raw({ type: 'application/json' }));
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));


// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.use('/api', apiRoutes);

app.get('/paymentService/health',(req,res)=>{
    res.status(200).json({
        success: true,
        message : "payment  service is working perfectly",
         status: 'healthy',
        timestamp: new Date(),
        uptime: process.uptime()
    })
})






// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log(' Connected to MongoDB'))
  .catch(err => console.error(' MongoDB connection error:', err));




// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});
// DB connection listen 
app.listen(PORT, () => {
  console.log(` Payment Service running on port ${PORT}`);
  console.log(` Webhook URL: http://localhost:${PORT}/api/v1/payments/webhook`);
});
