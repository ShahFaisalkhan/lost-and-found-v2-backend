// File: backend/models/User.js

const mongoose = require('mongoose'); // Import Mongoose

// Define the schema for users
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }, 
  email: { type: String, required: true, unique: true }, // Unique email
  password: { type: String, required: true }, // Password (hashed)
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
},
{ timestamps: true } // Adds createdAt and updatedAt fields);
)

module.exports = mongoose.model('User', userSchema); // Export the User model
