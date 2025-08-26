const mongoose = require('mongoose');

const connectToMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/airlinesDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(' MongoDB connected using Mongoose');
  } catch (err) {
    console.error(' MongoDB connection failed:', err);
    process.exit(1);
  }
};

module.exports = connectToMongo;