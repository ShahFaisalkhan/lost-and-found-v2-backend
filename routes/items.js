// File: backend/routes/items.js
const express = require('express');
const app = express();
const multer = require('../utils/multerConfig'); // Import Multer configuration
const Item = require('../models/Item');
const jwt = require('jsonwebtoken');

const router = express.Router();

// const cloudinary = require('cloudinary').v2;
// const { CloudinaryStorage } = require('multer-storage-cloudinary');
// const multer = require('multer');

// // Configure Cloudinary
// cloudinary.config({
//   // cloud_name: process.env.CLOUDINARY_CLOUD_NAME,  Replace with your Cloudinary cloud name
//   cloud_name: dq1vugfow, // Replace with your Cloudinary cloud name

//   // api_key: process.env.CLOUDINARY_API_KEY,  Replace with your API key
//   api_key: 415963984864831, // Replace with your API key

//   // api_secret: process.env.CLOUDINARY_API_SECRET, // Replace with your API secret
//   api_secret: JIzkc0zZS3i36B0YlXfdSgt6Hao, // Replace with your API secret

// });

// Set up Multer storage for Cloudinary
// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: {
//     folder: 'lost-and-found', // Folder name in Cloudinary
//     allowed_formats: ['jpeg', 'png', 'jpg'], // Allowed file types
//   },
// });

// const upload = multer({ storage });

// POST a new item with image upload
router.post('/', multer.single('image'), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('Missing token');
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const { title, description, location, date, isLost, contactNo } = req.body;

    const newItem = new Item({
      title,
      description,
      location,
      date,
      isLost,
      contactNo,
      imageUrl: req.file ? `/uploads/${req.file.filename}` : '',
      userId,
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(400).json({ message: 'Error creating item', error: err.message });
  }
});

router.get('/', async (req, res) => {
  const { page = 1, limit = 12, category, location, date, searchTerm } = req.query;
  // console.log("request.query on backedn is",req.query);
  try {
    let query = {};
    // // Apply category filter (lost or found)
    // if (category) query.isLost = category === 'lost';

    // // Apply date filter
    // if (date) query.date = { $gte: new Date(date) };
    if (category) {
      // Convert the category to lowercase and check if it matches "lost"
      if (category.toLowerCase() === 'lost') {
        query.isLost = true; // Set the filter to include lost items
      } else {
        query.isLost = false; // Set the filter to include found items
      }
    }

    if (date) {
      // Convert the date string to a Date object and filter items by creation date
      query.date = { $gte: new Date(date) }; // Include items created on or after this date
    }
    // Fetch all matching items for the above filters
    // let items = await Item.find(query);
    // console.log("query object is",query)
     let items = await Item.find(query).populate('userId', 'username'); // Populate the username field

    // Filter by location (case-insensitive exact match)
    if (location) {
      items = items.filter(
        (item) => item.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    // Filter by search term in title or description (case-insensitive)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(lowerSearchTerm) ||
          item.description.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Sort by the latest `createdAt` timestamp (newest first)
//     items.sort((a, b) => ...):

// The .sort() method is used to rearrange the order of the array items.
// It takes a comparison function as an argument.
// (a, b) =>:

// This is the comparison function.
// a and b are two items from the array that are compared during the sort process.
// new Date(b.createdAt):

// Converts the createdAt field of object b into a Date object.
// new Date(a.createdAt):

// Converts the createdAt field of object a into a Date object.
// new Date(b.createdAt) - new Date(a.createdAt):

// Subtracts the timestamp of a from b.
// If the result is:
// Positive: b comes before a (i.e., b is more recent).
// Negative: a comes before b (i.e., a is more recent).
// Zero: They are equal in terms of date, and their order does not change.
    items = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Pagination logic
    // items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // Array of items
    // limit = 3; // 3 items per page
    
    // page = 1; // First page
    // startIndex = (1 - 1) * 3 = 0;
    // paginatedItems = items.slice(0, 3); // [1, 2, 3]
    
    // page = 2; // Second page
    // startIndex = (2 - 1) * 3 = 3;
    // paginatedItems = items.slice(3, 6); // [4, 5, 6]
    
    // page = 3; // Third page
    // startIndex = (3 - 1) * 3 = 6;
    // paginatedItems = items.slice(6, 9); // [7, 8, 9]

    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + Number(limit));
    // totalPages = Math.ceil(items.length / limit);
    // console.log('totalPages are',totalPages)
    res.json({
      items: paginatedItems, // Paginated items
      totalPages: Math.ceil(items.length / limit), // Total pages
      currentPage: Number(page), // Current page
    });
  } catch (err) {
    console.error('Error fetching items:', err.message); // Log detailed error message
    res.status(500).json({ 
      message: 'An error occurred while fetching items', 
      error: err.message 
    });
  }
});

router.get('/my-items', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
 // You're destructuring req.query to extract page and limit, and providing default values (1 for page and 3 for limit) if they are not provided in the URL.
  const { page = 1, limit = 6 } = req.query; // Extract page and limit from query parameters
  // console.log("req.query in myitems is",req.query)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Fetch total count of items for pagination
    const totalItems = await Item.countDocuments({ userId });
    
    // Example: Imagine the Item collection has the following data:
// [ { id: 1, title: 'A', createdAt: '2023-01-01' },
 // { id: 2, title: 'B', createdAt: '2023-01-02' },
 // { id: 3, title: 'C', createdAt: '2023-01-03' },
 // { id: 4, title: 'D', createdAt: '2023-01-04' },
 // { id: 5, title: 'E', createdAt: '2023-01-05' }, ]
// page = 2, limit = 2:
//Skip: (2 - 1) * 2 = 2 → Skip the first 2 items (A, B).
//Limit: Return the next 2 items (C, D).
 
// Fetch paginated items for the logged-in user
    const items = await Item.find({ userId })
      .sort({ createdAt: -1 }) // Sort by latest created
      .skip((page - 1) * limit) // Skip items based on current page
      .limit(Number(limit)); // Limit the number of items returned

    res.status(200).json({
      items,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: Number(page),
    });
  } catch (err) {
    console.error('Error fetching items:', err.message);
    res.status(500).json({ message: 'Error fetching items', error: err.message });
  }
});

// GET a single item by ID
router.get('/:id', async (req, res) => {
  try {
    // const item = await Item.findById(req.params.id); // Fetch item by ID
    const item = await Item.findById(req.params.id).populate('userId', 'username'); // Populate username
    // console.log("item is in item/:id is",item)
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Update an item, including image
router.put('/:id', multer.single('image'), async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Decode the token
    // const item = await Item.findOne({ _id: req.params.id, userId: decoded.id }); // Verify item ownership
    const item = await Item.findOne({ _id: req.params.id }); // Verify item ownership
    if (!item) {
      return res.status(404).json({ message: 'Item not found or unauthorized' });
    }

    // Prepare updated fields
    const updatedFields = {
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      contactNo: req.body.contactNo,
      date: req.body.date,
      isLost: req.body.isLost === 'true', // Convert isLost to boolean
    };
    // If a new image is uploaded, update imageUrl
    if (req.file) {
      updatedFields.imageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedItem = await Item.findByIdAndUpdate(req.params.id, updatedFields, { new: true });
    res.json(updatedItem);
  } catch (err) {
    console.error('Error updating item:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


const fs = require('fs');
const path = require('path');

router.delete('/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Find the item and ensure it belongs to the logged-in user
    const item = await Item.findOne({ _id: req.params.id, userId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found or unauthorized' });
    }

    // If the item has an image, delete it from the uploads directory
    if (item.imageUrl) {
      const imagePath = path.join(__dirname, '../uploads', path.basename(item.imageUrl));
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error(`Failed to delete image file: ${imagePath}`, err);
        }
      });
    }

    // Delete the item from the database
    await Item.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Item and associated image deleted successfully' });
  } catch (err) {
    console.error('Error deleting item:', err.message);
    res.status(500).json({ message: 'Error deleting item', error: err.message });
  }
});


// Export the router
module.exports = router;
