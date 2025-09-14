const dotenv = require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./models/user'); 

const app = express();
const PORT = process.env.PORT || 5001;

// Basic security middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes); // optional

// Health check
app.get('/api/auth/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log(' Auth Service connected to MongoDB');
  app.listen(PORT, () => {
    console.log(` Auth Service running on port ${PORT}`);
  });
})
.catch(err => {
  console.error(' MongoDB connection error:', err);
});


app.listen(PORT,()=>{
    console.log("server created success on 5001");
    
})