const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '8.8.4.4']); } catch (e) {}

const mongoose = require('mongoose');

async function connectDB() {
  if (!process.env.MONGO_URI) return false;
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
    return true;
  } catch (error) {
    console.warn(`MongoDB unavailable: ${error.message}`);
    return false;
  }
}

module.exports = connectDB;
