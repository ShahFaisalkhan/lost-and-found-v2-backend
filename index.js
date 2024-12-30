// File: backend/server.js

const express = require('express'); // Import Express to create the server
const mongoose = require('mongoose'); // For MongoDB connection
const dotenv = require('dotenv'); // For environment variables
const cors = require('cors'); // To allow cross-origin requests
const bodyParser = require('body-parser'); // To parse incoming JSON data
const path = require("path");
dotenv.config(); // Load environment variables

const app = express(); // Initialize Express app
// Use dynamic CORS origin
// const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL;
console.log(CLIENT_BASE_URL)
// app.use(cors({ origin: CLIENT_BASE_URL }));
app.use(cors()); // Enable CORS for all routes
// Allow requests from your frontend's URL
// app.use(cors({
//   origin: ['http://localhost:3000', 'https://lost-and-found-orpin.vercel.app'], // Replace with your frontend URLs
//   methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow appropriate HTTP methods
//   allowedHeaders: ['Content-Type', 'Authorization'], // Allow required headers
// }));
app.use(bodyParser.json()); // Parse JSON data from requests
app.use(express.json()); // Parses JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded payloads
// File: backend/server.js
app.use('/uploads', express.static('uploads')); // Serve the 'uploads' folder

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Import routes
const itemRoutes = require('./routes/items'); // API routes for items
const authRoutes = require('./routes/auth'); // API routes for items
const adminRoutes = require('./routes/admin');
const contactRoute = require('./routes/contact');
app.use('/api/admin', adminRoutes); // Register admin routes
app.use('/api/items', itemRoutes); // Use the items API
app.use('/auth', authRoutes); // Use the items API
app.use('/api/contact', contactRoute);
app.get("/" ,(req,res) => {
  res.json("hello");
})
// Start the server on a specific port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
