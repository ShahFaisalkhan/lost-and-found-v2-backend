const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// The code const getStartOfDay = () => new Date().setHours(0, 0, 0, 0); is a helper function that calculates the timestamp for the start of the current day (midnight). Here's a step-by-step explanation of how it works:

// Create a New Date Object:

// new Date() creates a Date object representing the current date and time.
// Example:
// If the current time is 2024-12-15T14:23:45.000Z (2:23 PM UTC), new Date() will represent this moment in time.

// Reset the Time to Midnight:

// .setHours(0, 0, 0, 0) modifies the Date object to set:
// Hours to 0 (midnight).
// Minutes to 0.
// Seconds to 0.
// Milliseconds to 0.
// This effectively moves the time back to the very beginning of the day.
// Example:

// After calling .setHours(0, 0, 0, 0) on 2024-12-15T14:23:45.000Z, the Date object becomes 2024-12-15T00:00:00.000Z.
// Return the Timestamp:

// setHours returns the number of milliseconds since the Unix Epoch (January 1, 1970, at midnight UTC) for the modified date.
// This is useful for comparing dates or filtering data by time.
// Example:
// The result would be a timestamp, such as 1702684800000 (representing midnight of 2024-12-15 in UTC).
// Helper function to get start of the day
const getStartOfDay = () => new Date().setHours(0, 0, 0, 0);
// Create a New Date for the Start of the Month:
// new Date(year, month, day) creates a Date object for a specific year, month, and day.
// Here, new Date(new Date().getFullYear(), new Date().getMonth(), 1) creates a Date object for:
// Year: 2024 (current year).
// Month: 11 (December, zero-based indexing).
// Day: 1 (first day of the month).
// The resulting Date object automatically defaults to midnight.
// Example:
// The resulting Date object is 2024-12-01T00:00:00.000Z.
// Helper function to get start of the month
const getStartOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1);
// Admin dashboard route
router.get('/dashboard', async (req, res) => {

  try {
    const startOfDay = getStartOfDay();
// if your local timezone is UTC-5 (Eastern Standard Time), Sun Dec 01 2024 00:00:00 becomes 2024-11-30T19:00:00.000Z in UTC
// To display the Date in your local timezone, you can explicitly format it:
// Option 1: Use toLocaleString()
// console.log(startOfMonth.toLocaleString()); 
// Example Output: 12/1/2024, 12:00:00 AM (formatted for your local timezone).
// Option 2: Use toString()
// console.log(startOfMonth.toString());
// Example Output: Sun Dec 01 2024 00:00:00 GMT-0500 (Eastern Standard Time)
    const startOfMonth = getStartOfMonth();
    // console.log("getstartofday and getstartofmonth in admin.js",startOfDay,startOfMonth.toString(),newdate=new Date().toString())

    // Metrics for posts
    const postsToday = await Item.countDocuments({ createdAt: { $gte: startOfDay } });
    const postsThisMonth = await Item.countDocuments({ createdAt: { $gte: startOfMonth } });

    // Metrics for users
    const usersToday = await User.countDocuments({ createdAt: { $gte: startOfDay } });
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });

    res.status(200).json({
      postsToday,
      postsThisMonth,
      usersToday,
      usersThisMonth,
    });
  } catch (err) {
    console.error('Error fetching admin dashboard metrics:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin route to fetch posts with pagination and filters

router.get('/posts', async (req, res) => {
  const { page = 1, limit = 6, category, startDate, endDate, searchTerm } = req.query;
  // console.log("req.query in /posts is",req.query)
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access forbidden: Admins only' });
    }

    let query = {};

    // Apply category filter
    if (category) query.isLost = category === 'lost';

    // Apply date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    // console.log("query object in /posts is",query)
    // Fetch all matching posts with user details
    const posts = await Item.find(query)
      .populate('userId', 'username') // Fetch username for userId
      .sort({ createdAt: -1 });

    let filteredPosts = posts;

    // Apply search filter (case-insensitive includes)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filteredPosts = posts.filter(
        (post) =>
          (post.title && post.title.toLowerCase().includes(lowerSearchTerm)) ||
          (post.description && post.description.toLowerCase().includes(lowerSearchTerm)) ||
          (post.location && post.location.toLowerCase().includes(lowerSearchTerm)) ||
          (post.userId?.username && post.userId.username.toLowerCase().includes(lowerSearchTerm)) ||
          (post.contactNo && post.contactNo.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Pagination logic
    const startIndex = (page - 1) * limit;
    const paginatedPosts = filteredPosts.slice(startIndex, startIndex + Number(limit));

    res.status(200).json({
      posts: paginatedPosts, // Posts for the current page
      totalPages: Math.ceil(filteredPosts.length / limit), // Total pages based on filtered results
      currentPage: Number(page), // Current page number
    });
  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const fs = require('fs');
const path = require('path');

router.delete('/posts/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access forbidden: Admins only' });
    }

    // Find the post to retrieve its image URL
    const post = await Item.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // If the post has an associated image, delete it from the uploads directory
    if (post.imageUrl) {
      const imagePath = path.join(__dirname, '../uploads', path.basename(post.imageUrl));
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.error(`Failed to delete image file: ${imagePath}`, err);
        }
      });
    }

    // Delete the post from the database
    await Item.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Post and associated image deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;


router.get('/users', async (req, res) => {
  const { page = 1, limit = 36 } = req.query;

  try {
    const users = await User.find()
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const totalUsers = await User.countDocuments();

    // Fetch post counts synchronously without Promise.all
    const userProfiles = [];
    for (const user of users) {
      const postCount = await Item.countDocuments({ userId: user._id }); // Count posts for each user
      userProfiles.push({
        _id: user._id,
        username: user.username,
        email: user.email,
        password: user.password, // Plain password, if needed
        role: user.role,
        postCount,
      });
    }

    res.status(200).json({
      users: userProfiles,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: Number(page),
    });
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find all posts by the user
    const userPosts = await Item.find({ userId: user._id });

    // Delete images associated with the user's posts
    userPosts.forEach((post) => {
      if (post.imageUrl) {
        const imagePath = path.join(__dirname, '../uploads', path.basename(post.imageUrl));
        fs.unlink(imagePath, (err) => {
          if (err) {
            console.error(`Failed to delete image file: ${imagePath}`, err);
          }
        });
      }
    });

    // Delete all posts by the user
    await Item.deleteMany({ userId: user._id });

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'User and their posts (with images) deleted successfully' });
  } catch (err) {
    console.error('Error deleting user and posts:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


router.patch('/users/:id/promote', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'admin' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'User promoted to admin successfully', user });
  } catch (err) {
    console.error('Error promoting user:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});
router.patch('/users/:id/demote', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: 'user' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'Admin demoted to user successfully', user });
  } catch (err) {
    console.error('Error demoting admin:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

