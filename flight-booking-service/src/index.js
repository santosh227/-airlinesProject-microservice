const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const cors = require('cors')

// CRITICAL: JSON middleware MUST come first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
//  Routes come AFTER middleware
const apiroutes = require('./routes/index');
app.use('/api', apiroutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
})
.catch(err => {
  console.error('MongoDB connection error:', err);
});

app.listen(process.env.PORT || 4000, () => {
  console.log(`Server is running on port ${process.env.PORT || 4000}`);
});
