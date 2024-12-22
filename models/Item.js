// File: backend/models/Item.js

const mongoose = require('mongoose'); // Import Mongoose

// Define the schema for items
const itemSchema = new mongoose.Schema({
  title: { type: String, required: true }, // Title of the item
  description: { type: String, required: true }, // Description of the item
  location: { type: String, required: true }, // Location where it was lost/found
  contactNo: { type: String, required: true }, // Contact number for the item
  date: { type: Date, required: true }, // Date it was lost/found
  isLost: { type: Boolean, required: true }, // True if lost, false if found
  imageUrl: { type: String }, // Optional image URL
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
},
  { timestamps: true } // Adds createdAt and updatedAt fields
);


// Export the model
module.exports = mongoose.model('Item', itemSchema);
