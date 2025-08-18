require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Auth Service is running',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login'
    ]
  });
});

// Database connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/airline_auth')
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
});
