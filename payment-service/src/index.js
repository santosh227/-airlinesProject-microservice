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
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:4000']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.use('/api', apiRoutes);







// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🗄️ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));



// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Payment Service is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});
// DB connection listen 
app.listen(PORT, () => {
  console.log(`💳 Payment Service running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📧 Webhook URL: http://localhost:${PORT}/api/v1/payments/webhook`);
});
