import mongoose from 'mongoose';
import config from '../config/config.js';

let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    console.log('Using existing MongoDB connection');
    return;
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(config.mongodb.uri, options);
    
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas');
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      isConnected = false;
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      isConnected = false;
    });
    
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectFromDatabase = async () => {
  if (!isConnected) {
    return;
  }
  
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

export default { connectToDatabase, disconnectFromDatabase };
